import { CELL_BOXES, type PanelItem } from "./cell";

/**
 * Línea de tiempo de la sección "Trayectoria". El texto de cada hito sale de
 * `data/cell.ts` (la misma fuente que los paneles del laboratorio) y acá solo
 * se decide el orden y el período; así el CV no queda duplicado en dos lugares.
 */
export type TimelineEntry = {
  when: string;
  kind: "educacion" | "experiencia";
  item: PanelItem;
  /** Uno de los tres frentes actuales: se resalta en la línea de tiempo. */
  featured?: boolean;
};

const ITEMS = new Map<string, PanelItem>(
  CELL_BOXES.flatMap((box) => box.panel.blocks.flatMap((block) => block.items.map((item) => [item.title, item] as const)))
);

function pick(title: string): PanelItem {
  const item = ITEMS.get(title);
  if (!item) throw new Error(`Falta "${title}" en data/cell.ts (lo usa data/timeline.ts)`);
  return item;
}

// Del principio a hoy: de dónde vengo hacia dónde voy (se lee de arriba hacia abajo).
export const TIMELINE: readonly TimelineEntry[] = [
  { when: "2016 – 2022", kind: "educacion", item: pick("Técnico Secundario en Programación") },
  { when: "2019 – hoy", kind: "experiencia", item: pick("Desarrollador Full Stack · Freelance"), featured: true },
  { when: "2022 – hoy", kind: "experiencia", item: pick("Fundador y Coordinador · Club de Robótica") },
  { when: "2023 – 2025", kind: "educacion", item: pick("Tecnicatura Universitaria en Programación") },
  { when: "2024 – 2025", kind: "experiencia", item: pick("Ayudante de Cátedra · Programación I") },
  { when: "2025 – hoy", kind: "experiencia", item: pick("Profesor Universitario · UTN"), featured: true },
  { when: "2026 – hoy", kind: "educacion", item: pick("Licenciatura en Inteligencia Artificial"), featured: true },
];

/**
 * Los tres frentes de hoy, en este orden y con la misma jerarquía: desarrollo
 * Full Stack (desde 2019), docencia universitaria y la licenciatura en curso.
 * Son los mismos hitos de TIMELINE marcados como `featured`.
 */
export const CURRENT_FRONTS: readonly TimelineEntry[] = [
  TIMELINE[1],
  TIMELINE[5],
  TIMELINE[6],
];
