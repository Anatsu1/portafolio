/**
 * Cajas de la celda del brazo 3D: una por sección del portafolio.
 * `target` es el id de la sección real a la que apunta (la fase 4 abre un
 * panel lateral con el resumen y un enlace a esa sección).
 *
 * Los rótulos van en mayúsculas y sin tildes porque se estampan en la placa
 * metálica de la caja (estética de stencil industrial).
 */
export type CellBox = {
  id: string;
  label: string;
  target: string;
};

export const CELL_BOXES: readonly CellBox[] = [
  { id: "sobre-mi", label: "SOBRE MI", target: "sobre-mi" },
  { id: "educacion", label: "EDUCACION", target: "sobre-mi" },
  { id: "experiencia", label: "EXPERIENCIA", target: "proyectos" },
  { id: "proyectos", label: "PROYECTOS", target: "proyectos" },
  { id: "contacto", label: "CONTACTO", target: "contacto" },
] as const;
