import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import type { ArmPoints } from "./arm2d";

/**
 * Partes móviles del brazo en estilo "plano técnico" (las comparten el Hero
 * móvil y el laboratorio 2D): dos segmentos con contorno fino y eje punteado,
 * articulaciones con círculo de tornillos y una pinza de dos dedos que cuelga
 * siempre vertical (muñeca compensada, como un pick-and-place).
 *
 * No se re-renderiza al animar: el dueño de la animación llama a
 * `rigRef.current.draw()` en cada cuadro y eso escribe atributos SVG directo
 * (React no se entera). Es lo que mantiene el costo en unos pocos
 * `setAttribute` por cuadro.
 */

/** Trazo de las líneas: el gris del tema (azulado en claro, verdoso en oscuro). */
export const LINE = "rgb(var(--color-muted))";
/** Relleno de las piezas: el fondo de la página, así tapan lo que pasa por detrás. */
export const FILL = "rgb(var(--color-background))";

export type ArmRig = {
  /** Dibuja la pose. `grip` va de 0 (cerrada) a 1 (abierta). */
  draw: (points: ArmPoints, grip: number) => void;
};

type ArmSvgProps = {
  rigRef: MutableRefObject<ArmRig | null>;
  /** Grosor de los segmentos. */
  width: number;
  /** Separación de cada dedo al centro con la pinza cerrada y abierta. */
  fingerClosed: number;
  fingerOpen: number;
  /** Largo de los dedos (desde el bloque de la muñeca). */
  fingerLength: number;
  /** Grosor del trazo de contorno. */
  stroke?: number;
};

/** Distancia vertical entre la muñeca y el arranque de los dedos (el bloque de la pinza). */
export function gripperBlock(width: number) {
  return Math.round(width * 0.6);
}

export default function ArmSvg({ rigRef, width, fingerClosed, fingerOpen, fingerLength, stroke = 1.25 }: ArmSvgProps) {
  const segs = useRef<(SVGLineElement | null)[]>([]);
  const elbow = useRef<SVGGElement>(null);
  const shoulder = useRef<SVGGElement>(null);
  const gripper = useRef<SVGGElement>(null);
  const fingerL = useRef<SVGGElement>(null);
  const fingerR = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    rigRef.current = {
      draw: ({ shoulder: s, elbow: e, wrist: w }, grip) => {
        // Cada segmento son 3 líneas superpuestas: contorno, relleno y eje.
        const ends = [s, e, e, w];
        for (let seg = 0; seg < 2; seg++) {
          const a = ends[seg * 2];
          const b = ends[seg * 2 + 1];
          for (let k = 0; k < 3; k++) {
            const line = segs.current[seg * 3 + k];
            if (!line) continue;
            line.setAttribute("x1", a.x.toFixed(2));
            line.setAttribute("y1", a.y.toFixed(2));
            line.setAttribute("x2", b.x.toFixed(2));
            line.setAttribute("y2", b.y.toFixed(2));
          }
        }
        shoulder.current?.setAttribute("transform", `translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})`);
        elbow.current?.setAttribute("transform", `translate(${e.x.toFixed(2)} ${e.y.toFixed(2)})`);
        gripper.current?.setAttribute("transform", `translate(${w.x.toFixed(2)} ${w.y.toFixed(2)})`);
        const g = Math.max(0, Math.min(1, grip));
        const off = fingerClosed + (fingerOpen - fingerClosed) * g;
        fingerL.current?.setAttribute("transform", `translate(${(-off).toFixed(2)} 0)`);
        fingerR.current?.setAttribute("transform", `translate(${off.toFixed(2)} 0) scale(-1 1)`);
      },
    };
    return () => {
      rigRef.current = null;
    };
  }, [rigRef, fingerClosed, fingerOpen]);

  const block = gripperBlock(width);
  const joint = width * 0.78;
  const fw = Math.max(3, width * 0.32); // grosor del dedo
  // Dedo izquierdo: su cara interna está en x=0 (la que toca la pieza) y la
  // punta se dobla apenas hacia adentro. El derecho es su espejo.
  const finger = `M${-fw} ${block - 2} h${fw} v${fingerLength - 4} l${fw * 0.5} 4 h-${fw * 1.5} Z`;

  const segment = (i: number) => (
    <g key={i}>
      <line ref={(el) => (segs.current[i * 3] = el)} stroke={LINE} strokeWidth={width + stroke * 2} strokeLinecap="round" />
      <line ref={(el) => (segs.current[i * 3 + 1] = el)} stroke={FILL} strokeWidth={width} strokeLinecap="round" />
      <line
        ref={(el) => (segs.current[i * 3 + 2] = el)}
        stroke={LINE}
        strokeWidth={0.6}
        strokeDasharray="5 3 1 3"
        opacity={0.75}
      />
    </g>
  );

  return (
    <g>
      {segment(1)}
      {/* Pinza: bloque de muñeca + dos dedos que se abren en espejo. */}
      <g ref={gripper}>
        <g ref={fingerL}>
          <path d={finger} fill={FILL} stroke={LINE} strokeWidth={stroke} strokeLinejoin="round" />
        </g>
        <g ref={fingerR}>
          <path d={finger} fill={FILL} stroke={LINE} strokeWidth={stroke} strokeLinejoin="round" />
        </g>
        <rect
          x={-fingerOpen - fw}
          y={block - 4}
          width={(fingerOpen + fw) * 2}
          height={4}
          rx={1.5}
          fill={FILL}
          stroke={LINE}
          strokeWidth={stroke}
        />
        <rect x={-width * 0.55} y={0} width={width * 1.1} height={block - 3} rx={2} fill={FILL} stroke={LINE} strokeWidth={stroke} />
        <circle r={width * 0.42} fill={FILL} stroke={LINE} strokeWidth={stroke} />
        <circle r={1.6} fill={LINE} />
      </g>
      {segment(0)}
      <g ref={elbow}>
        <Joint r={joint} stroke={stroke} />
      </g>
      <g ref={shoulder}>
        <Joint r={joint * 1.25} stroke={stroke} />
      </g>
    </g>
  );
}

/** Articulación: aro exterior, círculo de tornillos punteado y eje con cruz. */
function Joint({ r, stroke }: { r: number; stroke: number }) {
  return (
    <g>
      <circle r={r} fill={FILL} stroke={LINE} strokeWidth={stroke} />
      <circle r={r * 0.62} fill="none" stroke={LINE} strokeWidth={0.7} strokeDasharray="1.5 2.2" />
      <circle r={r * 0.28} fill="none" stroke={LINE} strokeWidth={stroke} />
      <path d={`M${-r * 0.28} 0H${r * 0.28}M0 ${-r * 0.28}V${r * 0.28}`} stroke={LINE} strokeWidth={0.6} />
    </g>
  );
}
