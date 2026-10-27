import { useEffect, useState } from "react";

// Margen tras el aviso del Hero para que el navegador termine de decodificar
// y rasterizar el poster del brazo (si no, al abrirse las puertas se ve un
// bloque en blanco que se va llenando).
const SETTLE_MS = 450;

/**
 * Pasa a `true` un momento después de que `ready` se activa: con las fuentes
 * cargadas y un par de cuadros pintados. Sirve para no abrir las puertas del
 * vault sobre una página a medio dibujar.
 */
export function usePaintSettled(ready: boolean) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let timer = 0;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    fonts.then(() => {
      if (cancelled) return;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          timer = window.setTimeout(() => !cancelled && setSettled(true), SETTLE_MS);
        })
      );
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready]);

  return settled;
}
