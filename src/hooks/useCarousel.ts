import { useCallback, useEffect, useState } from "react";

/**
 * Estado de un carrusel: índice actual + navegación (next/prev/goTo) con
 * wrap-around, y auto-avance opcional. El auto-avance se reinicia ante
 * cualquier cambio de índice (incluida la navegación manual) para no cortar
 * el gesto del usuario. Pasá `autoMs = 0` para desactivarlo.
 */
export function useCarousel(length: number, autoMs = 5000) {
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (i: number) => setIndex(((i % length) + length) % length),
    [length]
  );
  const next = useCallback(() => setIndex((i) => (i + 1) % length), [length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + length) % length), [length]);

  useEffect(() => {
    if (autoMs <= 0 || length <= 1) return;
    const id = window.setInterval(next, autoMs);
    return () => window.clearInterval(id);
  }, [index, next, autoMs, length]);

  return { index, next, prev, goTo };
}
