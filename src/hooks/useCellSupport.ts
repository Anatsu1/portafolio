import { useMemo } from "react";

/**
 * ¿Corresponde mostrar la celda 3D o el respaldo estático (poster del brazo)?
 *
 * Se muestra el 3D solo con WebGL disponible, sin `prefers-reduced-motion` y
 * en pantallas de escritorio (el mismo corte que el `md` del proyecto: ancho
 * de tablet Y altura razonable). Un teléfono carga mucho peso para una
 * interacción pensada para mouse, así que ahí queda el respaldo.
 */
export function useCellSupport() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (!window.matchMedia("(min-width: 768px) and (min-height: 500px)").matches) return false;
    try {
      const canvas = document.createElement("canvas");
      return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      return false;
    }
  }, []);
}
