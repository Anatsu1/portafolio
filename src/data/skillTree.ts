import { PROJECTS } from "./projects";

export type SkillNode = {
  /** Id estable en kebab-case — clave de `requires` y del matching de stack. */
  id: string;
  label: string;
  /** Ids de prerequisitos ([] = raíz). Array: soporta multi-padre a futuro. */
  requires: string[];
  /** Columna de layout (0-based). Pista visual — puede ser mayor que la
   *  mínima necesaria, para balancear columnas. */
  tier: number;
  /** Strings de `Project.stack` que mapean a este nodo además del label
   *  (ej. "Bootstrap 5" → nodo "bootstrap"). */
  aliases?: string[];
};

/**
 * Árbol de skills curado a mano, con lectura pedagógica (el orden en que
 * realmente se aprenden estas tecnologías): markup → estilo/comportamiento
 * → frameworks/herramientas encima. Rama de infraestructura separada
 * (linux → docker; git → github/cursor) — ahí se enchufará el futuro
 * proyecto del homelab (cómo armé mi servidor/VPS).
 *
 * Agregar una skill = agregar un nodo acá (y nada más: la "prueba" se
 * deriva sola de los `stack` de los proyectos, ver PROVEN_NODE_IDS).
 */
export const SKILL_NODES: SkillNode[] = [
  // Tier 0 — fundamentos / raíces
  { id: "html5", label: "HTML5", requires: [], tier: 0 },
  { id: "git", label: "Git", requires: [], tier: 0 },
  { id: "linux", label: "Linux", requires: [], tier: 0 },
  // Tier 1
  { id: "css3", label: "CSS3", requires: ["html5"], tier: 1 },
  { id: "javascript", label: "JavaScript", requires: ["html5"], tier: 1 },
  { id: "github", label: "GitHub", requires: ["git"], tier: 1 },
  // Tier 2
  { id: "bootstrap", label: "Bootstrap", requires: ["css3"], tier: 2, aliases: ["Bootstrap 5"] },
  { id: "tailwind", label: "Tailwind CSS", requires: ["css3"], tier: 2 },
  { id: "typescript", label: "TypeScript", requires: ["javascript"], tier: 2 },
  { id: "nodejs", label: "Node.js", requires: ["javascript"], tier: 2 },
  { id: "cursor", label: "Cursor", requires: ["git"], tier: 2 },
  // Tier 3
  { id: "react", label: "React", requires: ["javascript"], tier: 3 },
  { id: "vite", label: "Vite", requires: ["javascript"], tier: 3 },
  { id: "express", label: "Express", requires: ["nodejs"], tier: 3 },
  { id: "rest", label: "REST", requires: ["nodejs"], tier: 3 },
  { id: "docker", label: "Docker", requires: ["linux"], tier: 3 },
  // Tier 4
  { id: "vitest", label: "Vitest", requires: ["vite"], tier: 4 },
  { id: "graphql", label: "GraphQL", requires: ["rest"], tier: 4 },
  { id: "postgresql", label: "PostgreSQL", requires: ["nodejs"], tier: 4 },
  { id: "mongodb", label: "MongoDB", requires: ["nodejs"], tier: 4 },
];

export const NODE_BY_ID = new Map(SKILL_NODES.map((n) => [n.id, n]));

export type SkillEdge = { from: string; to: string };

/** Aristas derivadas de `requires` (from = prerequisito, to = dependiente). */
export const EDGES: SkillEdge[] = SKILL_NODES.flatMap((node) =>
  node.requires.map((req) => ({ from: req, to: node.id }))
);

export const TIER_COUNT = Math.max(...SKILL_NODES.map((n) => n.tier)) + 1;

/** Nodos agrupados por tier, en orden de declaración. */
export const TIERS: SkillNode[][] = Array.from({ length: TIER_COUNT }, (_, t) =>
  SKILL_NODES.filter((n) => n.tier === t)
);

// Clausuras transitivas: todo lo que hay "aguas arriba" (prerequisitos de
// prerequisitos) y "aguas abajo" (dependientes de dependientes) de cada
// nodo. Se calculan una vez al cargar el módulo — el árbol es chico y
// estático. Un ciclo en `requires` colgaría el DFS: el flag `visiting`
// lo corta y lo denuncia en dev.
function closure(id: string, edgesOf: (n: SkillNode) => string[]): Set<string> {
  const out = new Set<string>();
  const visiting = new Set<string>();
  const walk = (current: string) => {
    if (visiting.has(current)) {
      if (import.meta.env.DEV) {
        console.error(`skillTree: ciclo detectado en "requires" pasando por "${current}"`);
      }
      return;
    }
    visiting.add(current);
    const node = NODE_BY_ID.get(current);
    if (node) {
      for (const next of edgesOf(node)) {
        if (!out.has(next)) {
          out.add(next);
          walk(next);
        }
      }
    }
    visiting.delete(current);
  };
  walk(id);
  return out;
}

export const ANCESTORS = new Map(
  SKILL_NODES.map((n) => [n.id, closure(n.id, (node) => node.requires)])
);

const CHILDREN = new Map<string, string[]>(SKILL_NODES.map((n) => [n.id, []]));
for (const edge of EDGES) CHILDREN.get(edge.from)?.push(edge.to);

export const DESCENDANTS = new Map(
  SKILL_NODES.map((n) => [n.id, closure(n.id, (node) => CHILDREN.get(node.id) ?? [])])
);

// Matching stack → nodo: label y aliases, en minúsculas.
const STACK_LOOKUP = new Map<string, string>();
for (const node of SKILL_NODES) {
  STACK_LOOKUP.set(node.label.toLowerCase(), node.id);
  for (const alias of node.aliases ?? []) {
    STACK_LOOKUP.set(alias.toLowerCase(), node.id);
  }
}

/**
 * Convierte los strings de `Project.stack` en ids de nodo. En dev avisa
 * por consola si un string no matchea ningún nodo — un typo al cargar un
 * proyecto nuevo se ve al instante, en vez de fallar en silencio.
 */
export function resolveStack(stack: string[]): string[] {
  const ids: string[] = [];
  for (const tech of stack) {
    const id = STACK_LOOKUP.get(tech.toLowerCase());
    if (id) {
      ids.push(id);
    } else if (import.meta.env.DEV) {
      console.warn(
        `skillTree: "${tech}" no matchea ningún nodo (¿falta un alias o un nodo nuevo?)`
      );
    }
  }
  return ids;
}

/** Ids de nodos "probados": alguna ficha de proyecto usa esa tecnología. */
export const PROVEN_NODE_IDS = new Set(PROJECTS.flatMap((p) => resolveStack(p.stack)));

/** Qué proyectos prueban cada nodo (para el filtro de fichas). */
export const PROJECT_IDS_BY_NODE = new Map<string, string[]>();
for (const project of PROJECTS) {
  for (const nodeId of resolveStack(project.stack)) {
    const list = PROJECT_IDS_BY_NODE.get(nodeId);
    if (list) list.push(project.id);
    else PROJECT_IDS_BY_NODE.set(nodeId, [project.id]);
  }
}
