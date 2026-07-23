import type { Project } from "./types";
import { prestarte } from "./prestarte";
import { utnNecochea } from "./utn-necochea";
import { ejemploHomelab } from "./ejemplo-homelab";
import { ejemploApi } from "./ejemplo-api";

export * from "./types";

// Qué skills quedan "probadas" por estos proyectos se deriva en
// `../skillTree.ts` (PROVEN_NODE_IDS): agregar un proyecto acá alcanza,
// no hay ninguna lista de skills que mantener a mano.
// OJO: los "ejemplo-*" son placeholders para probar el slider/filtro —
// mientras existan, sus stacks marcan nodos como "probados" (Docker,
// Linux, TypeScript…) sin proyecto real detrás. Reemplazar o sacar.
export const PROJECTS: Project[] = [prestarte, utnNecochea, ejemploHomelab, ejemploApi];
