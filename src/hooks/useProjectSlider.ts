import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { PlateFilterState } from "../components/sections/projects/ProjectPlate";

/**
 * Maneja el slider horizontal de fichas de proyecto (scroll-snap nativo):
 *
 * - `next`/`prev`/`goTo`: navegación por controles con desplazamiento
 *   animado (scrollTo smooth — con reduced-motion salta directo). El swipe
 *   táctil nativo sigue funcionando igual.
 * - `index`: la ficha alineada al borde izquierdo, derivada del scroll
 *   REAL (swipe, rueda o flechas — nunca se desincroniza porque no hay
 *   estado paralelo: el scroll es la única fuente de verdad).
 * - `atStart`/`atEnd`: para deshabilitar las flechas en los extremos (en
 *   desktop entran 2 fichas por vista, así que el final del scroll llega
 *   antes que la última ficha — no alcanza con mirar `index`).
 * - Focus del filtro: con la red de skills activa, viaja solo hasta la
 *   primera ficha que matchea (podría estar fuera de vista).
 *
 * Las posiciones se miden del DOM real (getBoundingClientRect relativo al
 * contenedor + scrollLeft), no por índice × ancho de slide — funciona
 * igual con cualquier min-width por breakpoint.
 */
export function useProjectSlider(
  orderedIds: readonly string[],
  filterStates: Map<string, PlateFilterState>,
  filterActive: boolean
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plateRefs = useRef(new Map<string, HTMLDivElement>());
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const reduce = useReducedMotion();

  const scrollToId = useCallback(
    (id: string) => {
      const container = containerRef.current;
      const el = plateRefs.current.get(id);
      if (!container || !el) return;
      const left =
        el.getBoundingClientRect().left -
        container.getBoundingClientRect().left +
        container.scrollLeft;
      container.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    },
    [reduce]
  );

  // Índice y extremos, recalculados en cada scroll (rAF-throttled) y en
  // resize; una pasada inicial deja los controles bien al montar.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;

    const measure = () => {
      const cRect = container.getBoundingClientRect();
      let best = 0;
      let bestDist = Infinity;
      orderedIds.forEach((id, i) => {
        const el = plateRefs.current.get(id);
        if (!el) return;
        const dist = Math.abs(el.getBoundingClientRect().left - cRect.left);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setIndex(best);
      setAtStart(container.scrollLeft <= 1);
      setAtEnd(container.scrollLeft >= container.scrollWidth - container.clientWidth - 1);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    measure();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [orderedIds]);

  // Focus del filtro: al seleccionar tecnología, ir a la primera que matchea.
  useEffect(() => {
    if (!filterActive) return;
    const matchId = orderedIds.find((id) => filterStates.get(id) === "match");
    if (matchId) scrollToId(matchId);
  }, [orderedIds, filterStates, filterActive, scrollToId]);

  const goTo = useCallback(
    (i: number) => {
      const id = orderedIds[Math.max(0, Math.min(orderedIds.length - 1, i))];
      if (id) scrollToId(id);
    },
    [orderedIds, scrollToId]
  );

  const registerPlate = (id: string) => (el: HTMLDivElement | null) => {
    if (el) plateRefs.current.set(id, el);
    else plateRefs.current.delete(id);
  };

  return {
    containerRef,
    registerPlate,
    index,
    atStart,
    atEnd,
    goTo,
    next: () => goTo(index + 1),
    prev: () => goTo(index - 1),
  };
}
