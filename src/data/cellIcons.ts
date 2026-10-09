/**
 * Iconos de las secciones del laboratorio. Es la única definición: la misma
 * lista de trazos (cuadrícula de 24 × 24, estilo línea) se usa en la chapa de
 * cada caja (canvas), en los rótulos, en los botones y en el panel (SVG), así
 * el visitante asocia el icono con la sección donde sea que lo vea. Todos van
 * en el color del tema (verde en oscuro, azul en claro): lo que distingue una
 * sección de otra es la forma del icono, no un color propio.
 *
 * Más adelante (Lab de iconos con red neuronal) son también los glifos que se
 * dibujan para navegar: por eso son formas simples y distinguibles entre sí.
 */
export type CellIconId = "sobre-mi" | "educacion" | "experiencia" | "proyectos" | "contacto" | "auto" | "manual";

export const CELL_ICON_PATHS: Record<CellIconId, readonly string[]> = {
  // Persona
  "sobre-mi": ["M16 8a4 4 0 1 1-8 0a4 4 0 0 1 8 0Z", "M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"],
  // Birrete
  educacion: ["M2 9l10-5l10 5l-10 5Z", "M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5", "M22 9v6"],
  // Maletín
  experiencia: [
    "M5 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z",
    "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2",
    "M3 13h18",
  ],
  // Código
  proyectos: ["M8 7l-5 5l5 5", "M16 7l5 5l-5 5", "M14 4l-4 16"],
  // Sobre
  contacto: ["M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z", "M3 8l9 6l9-6"],
  // Ciclo (modo automático)
  auto: ["M17 2l4 4l-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 22l-4-4l4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
  // Puntero (modo manual)
  manual: ["M4 4l7.07 17l2.51-7.39L21 11.07Z"],
};
