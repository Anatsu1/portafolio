import type { Project } from "./types";
import { prestarte } from "./prestarte";
import { utnNecochea } from "./utn-necochea";
import { mostrador } from "./mostrador";
import { manarem } from "./manarem";
import { beastore } from "./beastore";
import { sater } from "./sater";
import { vps } from "./vps";
import { portafolio } from "./portafolio";
import { migracionLegacy } from "./migracion-legacy";
import { paraVestirSantos } from "./para-vestir-santos";

export * from "./types";

// Qué skills quedan "probadas" por estos proyectos se deriva en
// `../skillTree.ts` (PROVEN_NODE_IDS): agregar un proyecto acá alcanza,
// no hay ninguna lista de skills que mantener a mano.
// Acá sólo van proyectos REALES: los `ejemplo-*` que había para probar el
// slider marcaban nodos como probados (Docker, Linux, TypeScript…) sin
// trabajo detrás, que en un portafolio de búsqueda laboral miente.
//
// El orden del array es el orden en pantalla: primero los proyectos para
// clientes, del más contundente al menos; después los personales y al final
// los de formación. `featured` solo sube al frente a los dos primeros.
export const PROJECTS: Project[] = [
  migracionLegacy,
  utnNecochea,
  mostrador,
  paraVestirSantos,
  prestarte,
  vps,
  portafolio,
  beastore,
  sater,
  manarem,
];
