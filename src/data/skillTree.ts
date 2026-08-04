import { PROJECTS } from "./projects";
import { BRAND_ICONS, type BrandIcon } from "./brandIcons";

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
 * Mapa de skills, agrupado por familia y con lectura de dependencia (qué
 * hace falta saber antes de lo que sigue). Seis raíces, una por familia:
 *
 *   web    → html → css → { bootstrap, tailwind }
 *   python → flask
 *   js     → { typescript, react → next, nodejs → express }
 *   bd     → sql → { postgresql, mysql, sqlite } ; nosql → mongodb
 *   herram.→ { git → github actions, docker }
 *
 * **Los agrupadores son nodos como cualquier otro** (web, bd, sql, nosql,
 * herramientas): se clickean y encienden su rama, aunque por sí solos no
 * matcheen ningún proyecto. Organizan la red sin necesitar un tipo de nodo
 * aparte.
 *
 * **Ningún nodo se saltea un tier.** El `tier` de cada uno es exactamente su
 * profundidad, así que toda arista une columnas contiguas. Cuando se usaba
 * el tier para emparejar columnas (un hijo dos columnas más allá de su
 * padre) las aristas cruzaban el gráfico entero en diagonal y pasaban por
 * encima de nodos ajenos. Vale más una columna despareja que ese ruido.
 *
 * **El árbol no se limita a lo que ya tiene proyecto.** Un nodo sin `stack`
 * que lo respalde se dibuja punteado (ver `proven` en SkillNodeButton) y al
 * filtrarlo no devuelve fichas — es intencional: el mapa muestra el
 * recorrido completo, no solo lo publicado. La "prueba" se deriva sola de
 * los `stack` de los proyectos, así que agregar una skill es agregar un
 * nodo acá y nada más.
 *
 * Fuera del árbol quedan: los servicios puntuales del VPS (n8n, redis,
 * uptime kuma, ufw…), que se cuentan en el resumen de esa ficha, y las
 * herramientas que no habilitan nada aguas abajo (editores, asistentes de
 * IA, Linux) — esas van en `TOOLBOX`, abajo.
 *
 * El `tier` es solo una pista de layout (la columna en desktop): un nodo
 * puede bajar de tier sin tocar sus `requires`, porque las aristas se miden
 * del DOM y cruzan columnas sin problema. Se reparten ~7 por tier para que
 * las cuatro columnas queden parejas; en mobile cada tier es una fila que
 * envuelve, así que no hay tope duro de nodos.
 */
// El orden dentro de cada tier sigue el de los padres en el tier anterior:
// así los hijos caen enfrente de quien los habilita y las aristas salen
// cortas y casi horizontales, en vez de cruzarse entre sí.
export const SKILL_NODES: SkillNode[] = [
  // Tier 0 — las cinco familias
  { id: "web", label: "Web", requires: [], tier: 0 },
  { id: "python", label: "Python", requires: [], tier: 0 },
  { id: "javascript", label: "JavaScript", requires: [], tier: 0, aliases: ["JS"] },
  { id: "bd", label: "BD", requires: [], tier: 0, aliases: ["Bases de datos"] },
  { id: "herramientas", label: "Herramientas", requires: [], tier: 0 },
  // Tier 1 — primer nivel de cada familia
  { id: "html5", label: "HTML5", requires: ["web"], tier: 1, aliases: ["HTML"] },
  { id: "flask", label: "Flask", requires: ["python"], tier: 1 },
  { id: "typescript", label: "TypeScript", requires: ["javascript"], tier: 1, aliases: ["TS"] },
  { id: "react", label: "React", requires: ["javascript"], tier: 1 },
  { id: "nodejs", label: "Node.js", requires: ["javascript"], tier: 1, aliases: ["Node"] },
  { id: "sql", label: "SQL", requires: ["bd"], tier: 1 },
  { id: "nosql", label: "NoSQL", requires: ["bd"], tier: 1 },
  { id: "git", label: "Git", requires: ["herramientas"], tier: 1 },
  { id: "docker", label: "Docker", requires: ["herramientas"], tier: 1 },
  // Tier 2
  { id: "css3", label: "CSS3", requires: ["html5"], tier: 2, aliases: ["CSS"] },
  { id: "next", label: "Next.js", requires: ["react"], tier: 2, aliases: ["Next"] },
  { id: "express", label: "Express", requires: ["nodejs"], tier: 2 },
  { id: "postgresql", label: "PostgreSQL", requires: ["sql"], tier: 2, aliases: ["Postgres"] },
  { id: "mysql", label: "MySQL", requires: ["sql"], tier: 2 },
  { id: "sqlite", label: "SQLite", requires: ["sql"], tier: 2 },
  { id: "mongodb", label: "MongoDB", requires: ["nosql"], tier: 2, aliases: ["Mongo"] },
  {
    id: "github-actions",
    label: "GitHub Actions",
    requires: ["git"],
    tier: 2,
    aliases: ["Git Actions", "GH Actions"],
  },
  // Tier 3 — hojas
  { id: "bootstrap", label: "Bootstrap", requires: ["css3"], tier: 3, aliases: ["Bootstrap 5"] },
  { id: "tailwind", label: "Tailwind CSS", requires: ["css3"], tier: 3, aliases: ["Tailwind"] },
];

/**
 * Herramientas que se usan todos los días pero no son parte del recorrido
 * técnico: cambiar de editor no habilita nada aguas abajo. Van debajo de la
 * red, a modo informativo y sin filtrar. Cada una lleva su marca monocroma
 * (ver `brandIcons.ts`); sumar una es agregar la entrada acá y su path allá.
 */
export const TOOLBOX: { group: string; items: BrandIcon[] }[] = [
  {
    group: "Editores e IDE",
    items: [BRAND_ICONS.vscode, BRAND_ICONS.cursor, BRAND_ICONS.intellij],
  },
  { group: "IA", items: [BRAND_ICONS.claudeCode, BRAND_ICONS.opencode] },
  { group: "Sistemas", items: [BRAND_ICONS.linux] },
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

/** Hijos directos: `requires` dado vuelta. */
const CHILDREN = new Map<string, string[]>();
for (const node of SKILL_NODES) {
  for (const req of node.requires) {
    const list = CHILDREN.get(req);
    if (list) list.push(node.id);
    else CHILDREN.set(req, [node.id]);
  }
}

/**
 * Clausura "aguas abajo": todo lo que se apoya en un nodo (sql → postgresql,
 * mysql, sqlite). **No confundir con `ANCESTORS`**, que va para el otro lado
 * y es puramente visual — usar los ancestros para filtrar es el viejo bug de
 * "tailwind O css3 O html5" que matcheaba todo (ver AGENTS.md).
 */
export const DESCENDANTS = new Map(
  SKILL_NODES.map((n) => [n.id, closure(n.id, (node) => CHILDREN.get(node.id) ?? [])])
);

/**
 * A qué nodos concretos responde cada filtro: el nodo mismo más su rama
 * hacia abajo. Así un agrupador como `sql` —que ningún `stack` nombra— deja
 * de ser una casilla muerta y muestra todo lo que use Postgres, MySQL o
 * SQLite; y `web` muestra lo que use HTML, CSS, Bootstrap o Tailwind.
 *
 * Elegir varios sigue siendo restrictivo (AND) entre nodos, así que sumar
 * `postgresql` a `sql` **achica** a los proyectos con Postgres: el AND se
 * aplica entre los nodos elegidos, no dentro del alcance de cada uno.
 */
export const FILTER_SCOPE = new Map(
  SKILL_NODES.map((n) => [n.id, new Set<string>([n.id, ...(DESCENDANTS.get(n.id) ?? [])])])
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

/**
 * Ids de nodos "probados" (borde sólido): alguna ficha usa esa tecnología
 * **o algo de su rama**. Lo segundo importa para los agrupadores: `sql` no
 * aparece en ningún `stack`, pero filtra y devuelve proyectos, así que
 * dibujarlo punteado —el signo de "todavía sin proyecto detrás"— sería
 * contradecir al filtro. `nosql` en cambio sigue punteado, porque su única
 * rama (MongoDB) no la usa nadie todavía.
 */
const DIRECTLY_PROVEN = new Set(PROJECTS.flatMap((p) => resolveStack(p.stack)));
export const PROVEN_NODE_IDS = new Set(
  SKILL_NODES.filter((n) =>
    [...(FILTER_SCOPE.get(n.id) ?? [])].some((id) => DIRECTLY_PROVEN.has(id))
  ).map((n) => n.id)
);

/** Qué proyectos prueban cada nodo (para el filtro de fichas). */
export const PROJECT_IDS_BY_NODE = new Map<string, string[]>();
for (const project of PROJECTS) {
  for (const nodeId of resolveStack(project.stack)) {
    const list = PROJECT_IDS_BY_NODE.get(nodeId);
    if (list) list.push(project.id);
    else PROJECT_IDS_BY_NODE.set(nodeId, [project.id]);
  }
}
