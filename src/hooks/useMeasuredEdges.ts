import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { EDGES } from "../data/skillTree";

export type MeasuredEdge = {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Measured = {
  width: number;
  height: number;
  edges: MeasuredEdge[];
};

/**
 * Mide las aristas del árbol de skills contra el DOM real: cada nodo se
 * registra con un callback ref, y las líneas conectan los **centros
 * medidos** (`getBoundingClientRect` relativo al contenedor) — correctas
 * en cualquier breakpoint/orientación por construcción, sin coordenadas a
 * ojo (lección del marcador descartado del Hero). Se re-mide con un
 * ResizeObserver sobre el contenedor: cualquier reflow que mueva nodos
 * (breakpoint, wrap, carga de fuentes) cambia la caja del contenedor o
 * dispara resize de ventana, ambos observados.
 */
export function useMeasuredEdges(containerRef: RefObject<HTMLElement>) {
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const [measured, setMeasured] = useState<Measured>({ width: 0, height: 0, edges: [] });

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();

    const center = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    };

    const edges: MeasuredEdge[] = [];
    for (const { from, to } of EDGES) {
      const fromEl = nodeRefs.current.get(from);
      const toEl = nodeRefs.current.get(to);
      if (!fromEl || !toEl) continue;
      const a = center(fromEl);
      const b = center(toEl);
      edges.push({ from, to, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }

    setMeasured((prev) => {
      // Evita re-render si nada se movió (ResizeObserver puede disparar
      // por cambios que no afectan a los nodos).
      const same =
        prev.width === box.width &&
        prev.height === box.height &&
        prev.edges.length === edges.length &&
        prev.edges.every(
          (e, i) =>
            e.x1 === edges[i].x1 &&
            e.y1 === edges[i].y1 &&
            e.x2 === edges[i].x2 &&
            e.y2 === edges[i].y2
        );
      return same ? prev : { width: box.width, height: box.height, edges };
    });
  }, [containerRef]);

  useLayoutEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    // La carga de la fuente (Sora) puede reflowear los labels después del
    // primer render.
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, containerRef]);

  return { measured, registerRef };
}
