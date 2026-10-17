import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";

const MIN_SCALE = 0.3;
const MAX_SCALE = 1.2;
const START_SCALE = 0.5;
const DRAG_THRESHOLD = 6; // px antes de considerar que es un arrastre y no un toque
const MAX_VIEW_H = 420;

type PanZoomProps = {
  children: ReactNode;
  /** Descripción para lectores de pantalla. */
  label: string;
};

/**
 * Visor con arrastre y zoom (botones) para mostrar un contenido ancho en una
 * pantalla angosta sin hacer scroll de página: el mapa de skills entra de
 * punta a punta a escala chica y se acerca a la zona que interesa. El alto del
 * visor sigue al contenido hasta `MAX_VIEW_H`; mientras todo entra en alto, el
 * dedo vertical sigue haciendo scroll de la página (`touch-action: pan-y`) y
 * solo el arrastre horizontal mueve el mapa.
 *
 * El contenido se transforma con CSS (`scale`), así que quien mida posiciones
 * dentro de él debe normalizar por la escala (ver `useMeasuredEdges`).
 */
export default function PanZoom({ children, label }: PanZoomProps) {
  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(START_SCALE);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [content, setContent] = useState({ w: 0, h: 0 });
  const [viewW, setViewW] = useState(0);
  const drag = useRef<{ id: number; sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const c = contentRef.current;
      const v = viewRef.current;
      if (c) setContent({ w: c.offsetWidth, h: c.offsetHeight });
      if (v) setViewW(v.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (contentRef.current) ro.observe(contentRef.current);
    if (viewRef.current) ro.observe(viewRef.current);
    return () => ro.disconnect();
  }, []);

  const viewH = Math.min(MAX_VIEW_H, Math.max(180, content.h * scale + 8));
  const fitsHeight = content.h * scale + 8 <= MAX_VIEW_H;

  const clamp = useCallback(
    (x: number, y: number, s: number) => {
      const cw = content.w * s;
      const ch = content.h * s;
      const cx = cw <= viewW ? (viewW - cw) / 2 : Math.min(0, Math.max(viewW - cw, x));
      const cy = ch <= viewH ? (viewH - ch) / 2 : Math.min(0, Math.max(viewH - ch, y));
      return { x: cx, y: cy };
    },
    [content.w, content.h, viewW, viewH]
  );

  // Mantiene la posición dentro de límites cuando cambian las medidas.
  useEffect(() => {
    setPos((p) => clamp(p.x, p.y, scale));
  }, [clamp, scale]);

  const zoomTo = (next: number) => {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    // Zoom hacia el centro del visor.
    const cxView = viewW / 2;
    const cyView = viewH / 2;
    const k = s / scale;
    setScale(s);
    setPos((p) => clamp(cxView - (cxView - p.x) * k, cyView - (cyView - p.y) * k, s));
  };

  const fit = () => {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (viewW - 8) / (content.w || 1)));
    setScale(s);
    setPos(clamp(0, 0, s));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      viewRef.current?.setPointerCapture(e.pointerId);
    }
    setPos(clamp(d.px + dx, d.py + dy, scale));
  };
  const end = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
    }
    drag.current = null;
  };

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-md border border-border/30 bg-surface/90 text-heading shadow-sm backdrop-blur transition active:scale-95 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary";

  return (
    <div className="relative">
      <div
        ref={viewRef}
        role="group"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        // Si fue un arrastre, el toque final no debe elegir el nodo que quedó debajo.
        onClickCapture={(e) => {
          if (justDragged.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        className="relative w-full select-none overflow-hidden rounded-xl border border-border/20 bg-surface/30"
        style={{ height: viewH, touchAction: fitsHeight ? "pan-y" : "none" }}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 w-max origin-top-left"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase leading-snug tracking-wide text-muted">Arrastrá para moverte · zoom con + y −</p>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" aria-label="Alejar el mapa" className={btn} onClick={() => zoomTo(scale / 1.3)} disabled={scale <= MIN_SCALE}>
            <Minus size={16} />
          </button>
          <button type="button" aria-label="Acercar el mapa" className={btn} onClick={() => zoomTo(scale * 1.3)} disabled={scale >= MAX_SCALE}>
            <Plus size={16} />
          </button>
          <button type="button" aria-label="Ver todo el mapa" className={btn} onClick={fit}>
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
