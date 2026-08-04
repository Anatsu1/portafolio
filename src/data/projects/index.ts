import type { Project } from "./types";
import { prestarte } from "./prestarte";
import { utnNecochea } from "./utn-necochea";
import { portafolio } from "./portafolio";
import { manarem } from "./manarem";
import { vps } from "./vps";

export * from "./types";

// Qué skills quedan "probadas" por estos proyectos se deriva en
// `../skillTree.ts` (PROVEN_NODE_IDS): agregar un proyecto acá alcanza,
// no hay ninguna lista de skills que mantener a mano.
// Acá sólo van proyectos REALES: los `ejemplo-*` que había para probar el
// slider marcaban nodos como probados (Docker, Linux, TypeScript…) sin
// trabajo detrás, que en un portafolio de búsqueda laboral miente.
export const PROJECTS: Project[] = [prestarte, utnNecochea, vps, manarem, portafolio];
