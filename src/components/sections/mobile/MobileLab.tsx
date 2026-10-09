import { useEffect, useId, useRef } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronUp } from "lucide-react";
import { CELL_BOXES } from "../../../data/cell";
import { CELL_ICON_PATHS, type CellIconId } from "../../../data/cellIcons";
import { useInViewport } from "../../../hooks/useInViewport";
import CellIcon from "../celda/CellIcon";
import ArmSvg, { FILL, LINE } from "./ArmSvg";
import MobileSheet from "./MobileSheet";
import {
  BOX_H,
  BOX_W,
  DIMS,
  PAD,
  PAD_H,
  RING,
  SCENE_H,
  SCENE_TOP,
  SCENE_W,
  VIEW,
  bottomOf,
  slotOf,
  useMobileLab,
} from "./useMobileLab";

/**
 * Laboratorio 2D (#celda en teléfonos, sin WebGL o con movimiento reducido):
 * la misma idea que la celda 3D, dibujada en SVG con el estilo plano del Hero.
 *
 * Tocar una caja (o su botón) hace que el brazo la busque, la lleve a la
 * plataforma ENTREGA y la abra; recién ahí sube la hoja con el contenido. Al
 * cerrarla, la caja se cierra y el brazo la devuelve.
 *
 * En automático el brazo recorre las cajas y las abre en la plataforma, pero
 * NO sube la hoja: en un teléfono una hoja que tapa 60% de la pantalla sin
 * que nadie la pidiera interrumpe el scroll. Muestra un aviso con "Abrir".
 */

const BRAND = "rgb(var(--color-brand-primary))";
const BRAND_SOFT = "rgb(var(--color-brand-primary) / 0.12)";
const SURFACE = "rgb(var(--color-surface))";
/** Orden de dibujo: de atrás (costados) hacia adelante (centro), según la profundidad del arco. */
const DRAW_ORDER = CELL_BOXES.map((_, i) => i).sort((a, b) => Math.sin(slotOf(a).phi) - Math.sin(slotOf(b).phi));
/** Escala de los iconos de 24 × 24 dentro de la caja. */
const ICON = 26;

export default function MobileLab() {
  const { ref: viewRef, visible } = useInViewport<HTMLDivElement>("0px");
  const lab = useMobileLab(visible);
  const { mode, setMode, showing, delivered, pick, release, rigRef, boxRefs, lidRefs, glowRefs } = lab;
  const sceneRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const sheetOpen = mode === "manual" && delivered !== null;

  // Al abrirse la hoja, que la plataforma (arriba de la escena) quede a la
  // vista por encima: así se ve la caja abierta y se entiende de dónde salió.
  useEffect(() => {
    if (!sheetOpen) return;
    const el = sceneRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const NAV = 72; // alto del header fijo
    if (Math.abs(top - NAV) > 40) {
      window.scrollBy({ top: top - NAV, behavior: lab.reduced ? "auto" : "smooth" });
    }
  }, [sheetOpen, lab.reduced]);

  const shoulder = bottomOf({ phi: 0, r: 0 }, DIMS.shoulder);
  const pad = bottomOf(PAD);
  const padTop = bottomOf(PAD, PAD_H);
  const ringR = RING + 30;

  return (
    <div ref={viewRef}>
      <div ref={sceneRef} className="relative scroll-mt-20">
        <svg
          // Arriba sobra aire: la escena empieza en SCENE_TOP (lo más alto es la luz de la caja abierta).
          viewBox={`0 ${SCENE_TOP} ${SCENE_W} ${SCENE_H - SCENE_TOP}`}
          className="mx-auto block aspect-[360/380] max-h-[420px] w-full"
          // pan-y: arrastrar sobre la escena sigue scrolleando la página.
          style={{ touchAction: "pan-y" }}
          role="img"
          aria-label="Brazo robótico con cinco cajas: Sobre mí, Educación, Experiencia, Proyectos y Contacto"
          fill="none"
        >
          <defs>
            <pattern id={`${id}-grid`} width={20} height={20} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={0.8} fill={LINE} />
            </pattern>
            <pattern id={`${id}-hazard`} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={8} height={8} fill="#14181a" />
              <rect width={4} height={8} fill="#d9a400" />
            </pattern>
            <linearGradient id={`${id}-beam`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={BRAND} stopOpacity={0.45} />
              <stop offset="1" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>

          <rect y={SCENE_TOP} width={SCENE_W} height={SCENE_H - SCENE_TOP} fill={`url(#${id}-grid)`} opacity={0.25} />

          {/* Piso de la celda: anillo del arco de cajas y radio de trabajo. */}
          <g stroke={LINE}>
            <ellipse cx={VIEW.cx} cy={VIEW.floorY} rx={ringR} ry={ringR * VIEW.depth} strokeWidth={1} opacity={0.7} />
            <ellipse cx={VIEW.cx} cy={VIEW.floorY} rx={RING} ry={RING * VIEW.depth} strokeWidth={0.7} strokeDasharray="4 4" opacity={0.6} />
            <path d={`M${VIEW.cx - ringR - 8} ${VIEW.floorY}H${VIEW.cx + ringR + 8}M${VIEW.cx} ${VIEW.floorY - 10}V${VIEW.floorY + ringR * VIEW.depth + 8}`} strokeWidth={0.6} strokeDasharray="10 3 2 3" opacity={0.5} />
          </g>

          {/* Plataforma ENTREGA (atrás a la derecha): columna, tapa con franja de seguridad. */}
          <g stroke={LINE} strokeWidth={1.2}>
            <ellipse cx={pad.x} cy={pad.y} rx={24} ry={24 * VIEW.depth} fill={FILL} />
            <rect x={pad.x - 13} y={padTop.y} width={26} height={pad.y - padTop.y} fill={FILL} />
            <path d={`M${pad.x - 13} ${padTop.y + 22}h26M${pad.x - 13} ${pad.y - 16}h26`} strokeWidth={0.7} />
            <rect x={pad.x - 46} y={padTop.y} width={92} height={9} rx={2} fill={`url(#${id}-hazard)`} />
            <rect x={pad.x - 46} y={padTop.y} width={92} height={9} rx={2} />
          </g>
          <text
            x={pad.x}
            y={padTop.y + 40}
            textAnchor="middle"
            fill={LINE}
            fontSize={8}
            fontWeight={700}
            letterSpacing={1.5}
            transform={`rotate(-90 ${pad.x} ${padTop.y + 40})`}
            dy={3}
          >
            ENTREGA
          </text>

          {/* Base del brazo: zócalo elíptico, columna y torreta. */}
          <g stroke={LINE} strokeWidth={1.2}>
            <ellipse cx={VIEW.cx} cy={VIEW.floorY} rx={30} ry={30 * VIEW.depth} fill={FILL} />
            <path d={`M${VIEW.cx - 30} ${VIEW.floorY}V${VIEW.floorY - 10}H${VIEW.cx + 30}V${VIEW.floorY}`} fill={FILL} />
            <ellipse cx={VIEW.cx} cy={VIEW.floorY - 10} rx={30} ry={30 * VIEW.depth} fill={FILL} />
            <rect x={VIEW.cx - 14} y={shoulder.y + 10} width={28} height={VIEW.floorY - 10 - shoulder.y - 10} fill={FILL} />
            <path d={`M${VIEW.cx - 14} ${shoulder.y + 40}h28M${VIEW.cx - 14} ${shoulder.y + 46}h28`} strokeWidth={0.7} />
            <rect x={VIEW.cx - 24} y={shoulder.y - 13} width={48} height={26} rx={6} fill={FILL} />
          </g>

          {/* Cajas: icono + rótulo + color de marca siempre juntos (se mueven juntos). */}
          {DRAW_ORDER.map((i) => {
            const box = CELL_BOXES[i];
            const active = showing === i;
            const long = box.label.length > 9;
            return (
              <g
                key={box.id}
                ref={(el) => (boxRefs.current[i] = el)}
                onClick={() => pick(i)}
                data-box={i}
                className="cursor-pointer"
                aria-hidden
              >
                {/* Área táctil más grande que el dibujo (≥ 44 px). */}
                <rect x={-BOX_W / 2 - 4} y={-BOX_H - 14} width={BOX_W + 8} height={BOX_H + 18} fill="transparent" />
                <ellipse cx={0} cy={0} rx={BOX_W / 2 + 4} ry={6} fill={LINE} opacity={0.12} />
                {/* Luz que sale de la caja abierta. */}
                <g ref={(el) => (glowRefs.current[i] = el)} opacity={0}>
                  <path d={`M${-BOX_W / 2 + 4} ${-BOX_H}L${-BOX_W / 2 - 8} ${-BOX_H - 46}H${BOX_W / 2 + 8}L${BOX_W / 2 - 4} ${-BOX_H}Z`} fill={`url(#${id}-beam)`} />
                </g>
                <rect
                  x={-BOX_W / 2}
                  y={-BOX_H}
                  width={BOX_W}
                  height={BOX_H}
                  rx={3}
                  fill={SURFACE}
                  stroke={BRAND}
                  strokeWidth={active ? 2 : 1.4}
                />
                <path d={`M${-BOX_W / 2} ${-17}H${BOX_W / 2}`} stroke={BRAND} strokeWidth={0.7} opacity={0.6} />
                <rect x={-BOX_W / 2} y={-17} width={BOX_W} height={17} rx={3} fill={BRAND_SOFT} />
                <g
                  transform={`translate(${-ICON / 2} ${-BOX_H + 6}) scale(${ICON / 24})`}
                  stroke={BRAND}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {CELL_ICON_PATHS[box.id as CellIconId].map((d, k) => (
                    <path key={k} d={d} />
                  ))}
                </g>
                <text
                  x={0}
                  y={-5.5}
                  textAnchor="middle"
                  fill="rgb(var(--color-heading))"
                  fontSize={8.5}
                  fontWeight={700}
                  letterSpacing={0.3}
                  {...(long ? { textLength: BOX_W - 6, lengthAdjust: "spacingAndGlyphs" } : {})}
                >
                  {box.label}
                </text>
                {/* Tapa: gira sobre la bisagra izquierda (la anima el controlador). */}
                <g ref={(el) => (lidRefs.current[i] = el)}>
                  <rect x={-BOX_W / 2 - 2} y={-BOX_H - 6} width={BOX_W + 4} height={7} rx={2} fill={SURFACE} stroke={BRAND} strokeWidth={1.3} />
                  <rect x={-6} y={-BOX_H - 9} width={12} height={3} rx={1.5} fill={FILL} stroke={BRAND} strokeWidth={1} />
                </g>
              </g>
            );
          })}

          <ArmSvg rigRef={rigRef} width={13} fingerClosed={29} fingerOpen={42} fingerLength={26} />
        </svg>

      </div>

      {/* Franja de avisos con alto fijo (no salta el layout): en automático
          invita a tocar una caja y, cuando hay una abierta en la plataforma,
          ofrece abrir su hoja. Antes iban sobre la escena y tapaban la caja. */}
      <div className="mt-2 flex h-[52px] items-center">
        {mode === "auto" && delivered === null && (
          <p className="flex items-center gap-2 rounded-full border border-brand-primary/40 bg-background/80 px-3 py-1.5 text-xs font-semibold text-heading">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
            </span>
            <CellIcon id="manual" size={14} className="text-brand-primary" />
            Tocá una caja y el brazo te la trae
          </p>
        )}
        {mode === "auto" && delivered !== null && (
          <button
            type="button"
            onClick={() => pick(delivered)}
            className="flex h-full w-full items-center gap-3 rounded-xl border border-brand-primary/40 bg-background/90 px-2.5 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-primary/60 bg-brand-primary/10 text-brand-primary">
              <CellIcon id={CELL_BOXES[delivered].id as CellIconId} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
                {CELL_BOXES[delivered].panel.kicker}
              </span>
              <span className="block truncate font-display text-base font-bold leading-tight text-heading">
                {CELL_BOXES[delivered].panel.title}
              </span>
            </span>
            <span className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand">
              Abrir <ChevronUp size={16} />
            </span>
          </button>
        )}
        {mode === "manual" && (
          <p className="px-1 text-xs text-muted">
            {delivered !== null ? "Cerrá la hoja y el brazo devuelve la caja." : "Elegí una caja (en la escena o abajo) y el brazo te la trae."}
          </p>
        )}
      </div>

      {/* Controles: las cinco secciones (también para teclado) y el modo. */}
      <div className="mt-1 grid grid-cols-5 gap-1.5">
        {CELL_BOXES.map((box, i) => (
          <button
            key={box.id}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={showing === i}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg border px-0 py-2 text-[9px] font-semibold leading-tight tracking-tight min-[380px]:text-[10px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              showing === i
                ? "border-brand-primary bg-brand-primary/15 text-heading"
                : "border-border/15 bg-surface/60 text-body"
            }`}
          >
            <CellIcon id={box.id as CellIconId} size={20} className="text-brand-primary" />
            <span className="max-w-full truncate">{box.panel.title}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Modo del brazo" className="flex rounded-lg border border-border/15 bg-surface/60 p-0.5">
          {(["auto", "manual"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              disabled={m === "auto" && lab.reduced}
              onClick={() => setMode(m)}
              className={`flex min-h-[44px] items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-40 ${
                mode === m ? "bg-brand-primary text-on-brand" : "text-body"
              }`}
            >
              <CellIcon id={m} size={14} />
              {m === "auto" ? "Automático" : "Manual"}
            </button>
          ))}
        </div>
        <p className="text-right text-[11px] leading-tight text-muted">
          {showing !== null ? `Moviendo: ${CELL_BOXES[showing].panel.title}` : mode === "auto" ? "Ciclo automático" : "Esperando pedido"}
        </p>
      </div>

      <AnimatePresence>{mode === "manual" && delivered !== null && <MobileSheet key={delivered} index={delivered} onClose={release} />}</AnimatePresence>
    </div>
  );
}
