import { PROJECTS } from "./projects";
import { CELL_BOXES } from "./cell";
import { FILTER_SCOPE, NODE_BY_ID, PROJECT_IDS_BY_NODE, SKILL_NODES } from "./skillTree";

/** Minúsculas, sin tildes ni símbolos: "Node.js" y "nodejs" se encuentran. */
function norm(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function subsequence(needle: string, hay: string) {
  let i = 0;
  for (const ch of hay) if (ch === needle[i]) i++;
  return i === needle.length;
}

function score(query: string, term: string) {
  if (!query || !term) return 0;
  if (term === query) return 100;
  if (term.startsWith(query)) return 80;
  if (term.includes(query)) return 60;
  if (query.length >= 3 && subsequence(query, term)) return 30;
  return 0;
}

export type SearchHit =
  | { kind: "skill"; id: string; label: string }
  | { kind: "box"; index: number; label: string; id: string };

/** Sugerencias para el buscador: tecnologías del mapa de skills y secciones del laboratorio. */
export function searchLab(raw: string, limit = 6): SearchHit[] {
  const q = norm(raw);
  if (!q) return [];
  const hits: (SearchHit & { score: number })[] = [];

  for (const node of SKILL_NODES) {
    const best = Math.max(score(q, norm(node.label)), ...(node.aliases ?? []).map((a) => score(q, norm(a)) - 10));
    if (best > 0) hits.push({ kind: "skill", id: node.id, label: node.label, score: best });
  }
  CELL_BOXES.forEach((box, index) => {
    const best = Math.max(score(q, norm(box.panel.title)), score(q, norm(box.label)));
    if (best > 0) hits.push({ kind: "box", index, id: box.id, label: box.panel.title, score: best + 5 });
  });

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type SkillSummary = {
  label: string;
  projects: { id: string; title: string }[];
  /** Frase lista para mostrar. Determinista y basada solo en los datos reales de los proyectos. */
  text: string;
};

/** Qué proyectos usan una tecnología (o algo de su rama) y cómo contarlo sin inventar nada. */
export function describeSkill(nodeId: string): SkillSummary {
  const node = NODE_BY_ID.get(nodeId);
  const label = node?.label ?? nodeId;
  const ids = new Set<string>();
  for (const scopeId of FILTER_SCOPE.get(nodeId) ?? [nodeId]) {
    for (const projectId of PROJECT_IDS_BY_NODE.get(scopeId) ?? []) ids.add(projectId);
  }
  const projects = PROJECTS.filter((p) => ids.has(p.id)).map((p) => ({ id: p.id, title: p.title }));

  const text =
    projects.length === 0
      ? `${label} está en mi mapa de skills como parte del recorrido, pero todavía no lo usé en un proyecto publicado.`
      : projects.length === 1
        ? `Usé ${label} en un proyecto: ${projects[0].title}.`
        : `Usé ${label} en ${projects.length} proyectos: ${projects.map((p) => p.title).join(", ")}.`;
  return { label, projects, text };
}
