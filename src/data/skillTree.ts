import { PROJECTS } from "./projects";
import { BRAND_ICONS, type BrandIcon } from "./brandIcons";

export type SkillNode = {
  /** Id estable en kebab-case — clave de `requires` y del matching de stack. */
  id: string;
  label: string;
  /** Ids de prerequisitos ([] = raíz). Array: soporta multi-padre a futuro;
   *  el PRIMERO manda para el layout (ver `LAYOUT_CHILDREN`). */
  requires: string[];
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
 * **La columna de cada nodo es su profundidad, y se calcula sola** (`DEPTH`):
 * ya no hay campo `tier` que mantener a mano ni que se pueda desincronizar.
 * Como el layout dibuja cada familia en su propia fila (ver SkillTree.tsx),
 * toda arista une columnas contiguas dentro de una misma rama y ninguna
 * cruza el gráfico.
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
 */
// El orden de este array es el que se ve en pantalla: las raíces salen en
// este orden de arriba hacia abajo (web, python, javascript, bd,
// herramientas) y los hijos de un mismo padre también. Por eso se declara
// familia por familia, en el mismo orden en que se dibuja.
export const SKILL_NODES: SkillNode[] = [
  // Familia web
  { id: "web", label: "Web", requires: [] },
  { id: "html5", label: "HTML5", requires: ["web"], aliases: ["HTML"] },
  { id: "css3", label: "CSS3", requires: ["html5"], aliases: ["CSS"] },
  { id: "bootstrap", label: "Bootstrap", requires: ["css3"], aliases: ["Bootstrap 5"] },
  { id: "tailwind", label: "Tailwind CSS", requires: ["css3"], aliases: ["Tailwind"] },
  // Familia python
  { id: "python", label: "Python", requires: [] },
  { id: "flask", label: "Flask", requires: ["python"] },
  // Familia javascript
  { id: "javascript", label: "JavaScript", requires: [], aliases: ["JS"] },
  { id: "typescript", label: "TypeScript", requires: ["javascript"], aliases: ["TS"] },
  { id: "react", label: "React", requires: ["javascript"] },
  { id: "next", label: "Next.js", requires: ["react"], aliases: ["Next"] },
  { id: "nodejs", label: "Node.js", requires: ["javascript"], aliases: ["Node"] },
  { id: "express", label: "Express", requires: ["nodejs"] },
  // Familia bases de datos
  { id: "bd", label: "BD", requires: [], aliases: ["Bases de datos"] },
  { id: "sql", label: "SQL", requires: ["bd"] },
  { id: "postgresql", label: "PostgreSQL", requires: ["sql"], aliases: ["Postgres"] },
  { id: "mysql", label: "MySQL", requires: ["sql"] },
  { id: "sqlite", label: "SQLite", requires: ["sql"] },
  { id: "nosql", label: "NoSQL", requires: ["bd"] },
  { id: "mongodb", label: "MongoDB", requires: ["nosql"], aliases: ["Mongo"] },
  // Familia herramientas
  { id: "herramientas", label: "Herramientas", requires: [] },
  { id: "git", label: "Git", requires: ["herramientas"] },
  {
    id: "github-actions",
    label: "GitHub Actions",
    requires: ["git"],
    aliases: ["Git Actions", "GH Actions"],
  },
  { id: "docker", label: "Docker", requires: ["herramientas"] },
];

/**
 * Herramientas que se usan todos los días pero no son parte del recorrido
 * técnico: cambiar de editor no habilita nada aguas abajo. Van debajo de la
 * red, a modo informativo y sin filtrar. Cada una lleva su marca monocroma
 * (ver `brandIcons.ts`); sumar una es agregar la entrada acá y su path allá.
 *
 * **Nada de acá puede aparecer en el `stack` de un proyecto**: no hay nodo
 * que lo matchee, así que no filtraría y `resolveStack` avisaría por
 * consola. Por eso Docker, Git y GitHub Actions —que sí están en el stack
 * del VPS— siguen siendo nodos del árbol y no chips.
 *
 * El grupo DevOps son las piezas concretas del VPS (ver ese proyecto): se
 * nombran en su resumen, pero como chips quedan a la vista de un reclutador
 * que escanea la sección sin leer la ficha entera.
 */
export const TOOLBOX: { group: string; items: BrandIcon[] }[] = [
  {
    group: "Editores e IDE",
    items: [BRAND_ICONS.vscode, BRAND_ICONS.cursor, BRAND_ICONS.intellij],
  },
  { group: "IA", items: [BRAND_ICONS.claudeCode, BRAND_ICONS.opencode] },
  {
    group: "DevOps",
    items: [
      BRAND_ICONS.nginx,
      BRAND_ICONS.traefik,
      BRAND_ICONS.cloudflare,
      BRAND_ICONS.portainer,
      BRAND_ICONS.n8n,
      BRAND_ICONS.redis,
      BRAND_ICONS.uptimeKuma,
    ],
  },
  { group: "Sistemas", items: [BRAND_ICONS.linux, BRAND_ICONS.bash] },
];

export const NODE_BY_ID = new Map(SKILL_NODES.map((n) => [n.id, n]));

export type SkillEdge = { from: string; to: string };

/** Aristas derivadas de `requires` (from = prerequisito, to = dependiente). */
export const EDGES: SkillEdge[] = SKILL_NODES.flatMap((node) =>
  node.requires.map((req) => ({ from: req, to: node.id }))
);

/** Raíces (sin prerequisitos): una fila del mapa cada una, en este orden. */
export const ROOTS = SKILL_NODES.filter((n) => n.requires.length === 0);

/**
 * Hijos **para dibujar**, agrupados por su primer `requires`. Si algún día
 * un nodo tiene dos padres, se dibuja una sola vez —colgado del primero— y
 * la arista al otro padre igual se traza (sale de `EDGES`, que recorre
 * todos los `requires`). Sin esto el nodo aparecería duplicado y las dos
 * copias pelearían por el mismo ref de medición.
 */
export const LAYOUT_CHILDREN = new Map<string, SkillNode[]>();
for (const node of SKILL_NODES) {
  const parent = node.requires[0];
  if (!parent) continue;
  const list = LAYOUT_CHILDREN.get(parent);
  if (list) list.push(node);
  else LAYOUT_CHILDREN.set(parent, [node]);
}

/**
 * Columna de cada nodo = su profundidad en el árbol. Se calcula, no se
 * declara: antes era un campo `tier` a mano y cualquier descuido dejaba
 * aristas cruzando el gráfico. El `seen` corta un ciclo en `requires`
 * (ANCESTORS ya lo denuncia por consola) para no reventar la pila al
 * cargar el módulo.
 */
const DEPTH = new Map<string, number>();
function depthOf(id: string, seen: Set<string> = new Set()): number {
  const cached = DEPTH.get(id);
  if (cached !== undefined) return cached;
  if (seen.has(id)) return 0;
  seen.add(id);
  const node = NODE_BY_ID.get(id);
  const depth = !node?.requires.length
    ? 0
    : Math.max(...node.requires.map((req) => depthOf(req, seen) + 1));
  seen.delete(id);
  DEPTH.set(id, depth);
  return depth;
}
for (const node of SKILL_NODES) depthOf(node.id);

/** Cantidad de columnas ("fases") del mapa. */
export const TIER_COUNT = Math.max(...DEPTH.values()) + 1;

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
