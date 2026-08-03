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
 * → frameworks encima. Ramas separadas para el backend en Python
 * (python → flask → sqlite) y para el versionado/infra (git → github
 * actions; docker) — ahí se enchufará el futuro proyecto del VPS.
 *
 * **Solo tecnologías que uso de verdad en algún proyecto** (los cargados y
 * los que faltan cargar — ver `docs/stack-por-proyecto.md`). Nada de relleno:
 * cada nodo es una casilla que alguien puede clickear esperando ver trabajo
 * detrás. Los servicios puntuales del VPS (n8n, redis, uptime kuma, ufw…) no
 * son nodos: se cuentan en el resumen de esa ficha. Las herramientas que no
 * se "prueban" con un proyecto (editores, Linux) van en `TOOLBOX`, abajo.
 *
 * Agregar una skill = agregar un nodo acá (y nada más: la "prueba" se
 * deriva sola de los `stack` de los proyectos, ver PROVEN_NODE_IDS).
 *
 * **Tope de 4 nodos por tier:** en mobile cada fase es una fila sin wrap y
 * los nodos miden w-16 + gap-2 → 5 nodos son 352px y a 375px hay 327
 * disponibles, así que la fase se sale de pantalla y desplaza toda la
 * sección. El `tier` es una pista de layout: si un tier se llena, el nodo
 * puede bajar al siguiente sin tocar sus `requires` (las aristas cruzan
 * columnas sin problema).
 */
export const SKILL_NODES: SkillNode[] = [
  // Tier 0 — fundamentos / raíces
  { id: "html5", label: "HTML5", requires: [], tier: 0, aliases: ["HTML"] },
  { id: "python", label: "Python", requires: [], tier: 0 },
  { id: "git", label: "Git", requires: [], tier: 0 },
  { id: "docker", label: "Docker", requires: [], tier: 0 },
  // Tier 1
  { id: "css3", label: "CSS3", requires: ["html5"], tier: 1, aliases: ["CSS"] },
  { id: "javascript", label: "JavaScript", requires: ["html5"], tier: 1, aliases: ["JS"] },
  { id: "flask", label: "Flask", requires: ["python"], tier: 1 },
  {
    id: "github-actions",
    label: "GitHub Actions",
    requires: ["git"],
    tier: 1,
    aliases: ["Git Actions", "GH Actions"],
  },
  // Tier 2
  { id: "bootstrap", label: "Bootstrap", requires: ["css3"], tier: 2, aliases: ["Bootstrap 5"] },
  { id: "tailwind", label: "Tailwind CSS", requires: ["css3"], tier: 2, aliases: ["Tailwind"] },
  { id: "typescript", label: "TypeScript", requires: ["javascript"], tier: 2, aliases: ["TS"] },
  { id: "nodejs", label: "Node.js", requires: ["javascript"], tier: 2, aliases: ["Node"] },
  // Tier 3
  // SQLite depende de Flask (tier 1) pero va acá para no dejar 5 nodos en el
  // tier 2 — ver el tope de 4 arriba.
  { id: "sqlite", label: "SQLite", requires: ["flask"], tier: 3 },
  { id: "react", label: "React", requires: ["javascript"], tier: 3 },
  { id: "express", label: "Express", requires: ["nodejs"], tier: 3 },
  {
    id: "postgresql",
    label: "PostgreSQL",
    requires: ["nodejs"],
    tier: 3,
    aliases: ["Postgres"],
  },
];

/**
 * Herramientas del día a día que NO son nodos del árbol: no se demuestran
 * con un proyecto (no hay `stack` que las pruebe), así que como filtro
 * serían una casilla vacía. Van debajo de la red, a modo informativo — un
 * reclutador igual quiere saber que están. Sumar una es agregar un string.
 */
export const TOOLBOX: { group: string; items: string[] }[] = [
  { group: "Editores e IDE", items: ["VS Code", "Cursor", "IntelliJ IDEA"] },
  { group: "Sistemas", items: ["Linux"] },
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

// Clausura transitiva "aguas arriba": todos los prerequisitos de los
// prerequisitos de cada nodo. Se calcula una vez al cargar el módulo — el
// árbol es chico y estático. Un ciclo en `requires` colgaría el DFS: el
// flag `visiting` lo corta y lo denuncia en dev.
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
