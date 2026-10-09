/**
 * Cinemática 2D del brazo de las vistas móviles (Hero y laboratorio 2D).
 *
 * Es matemática pura, sin three ni React: el laboratorio 3D tiene su propia IK
 * (`celda/kinematics.ts`) pero importarla arrastraría three al paquete móvil.
 *
 * El brazo se resuelve igual que en el 3D: un objetivo en polares alrededor
 * de la base (`phi` = giro de la torreta, `r` = distancia horizontal al eje,
 * `y` = altura) y un brazo de dos segmentos que trabaja en su propio plano
 * vertical. Después se proyecta a la pantalla como una elevación técnica con
 * un poco de profundidad: lo que está "hacia el visitante" baja un poco en
 * pantalla. Así el brazo puede girar de un lado al otro de la base sin el
 * salto que tendría un brazo plano (en 2D puro, pasar de la izquierda a la
 * derecha obliga a invertir el codo de golpe).
 */

export type Point = { x: number; y: number };

/** Objetivo de la muñeca, en polares alrededor del eje de la base. */
export type Reach = { phi: number; r: number; y: number };

/** Dónde está la base en pantalla y cómo se proyecta la profundidad. */
export type View = {
  /** x de pantalla del eje de la base. */
  cx: number;
  /** y de pantalla del piso en el eje de la base (profundidad 0). */
  floorY: number;
  /** Cuánto baja en pantalla una unidad de profundidad hacia el visitante. */
  depth: number;
};

export type ArmDims = {
  /** Altura del hombro sobre el piso. */
  shoulder: number;
  l1: number;
  l2: number;
};

/** Pose resuelta, ya en coordenadas de pantalla. */
export type ArmPoints = { shoulder: Point; elbow: Point; wrist: Point };

/** Punto del mundo (giro, distancia, altura) → pantalla. */
export function project(view: View, phi: number, r: number, y: number): Point {
  return {
    x: view.cx + r * Math.cos(phi),
    y: view.floorY - y + r * Math.sin(phi) * view.depth,
  };
}

/**
 * IK de dos segmentos con el codo siempre hacia arriba. Si el objetivo queda
 * fuera de alcance, el brazo se estira hacia él sin romperse (no lanza ni
 * devuelve NaN), así una coreografía mal calibrada se nota a la vista y no
 * congela la animación.
 */
export function solveArm(view: View, dims: ArmDims, reach: Reach, out?: ArmPoints): ArmPoints {
  const { l1, l2 } = dims;
  const dx = reach.r;
  const dy = reach.y - dims.shoulder;
  const max = l1 + l2 - 1e-3;
  const min = Math.abs(l1 - l2) + 1e-3;
  const d = Math.min(max, Math.max(min, Math.hypot(dx, dy)));
  const cos2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const q2 = Math.acos(Math.max(-1, Math.min(1, cos2)));
  // Sumar este ángulo (en vez de restarlo) es lo que deja el codo arriba.
  const q1 = Math.atan2(dy, dx) + Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));

  const er = l1 * Math.cos(q1);
  const ey = dims.shoulder + l1 * Math.sin(q1);
  const wr = er + l2 * Math.cos(q1 - q2);
  const wy = ey + l2 * Math.sin(q1 - q2);

  const res = out ?? { shoulder: { x: 0, y: 0 }, elbow: { x: 0, y: 0 }, wrist: { x: 0, y: 0 } };
  const s = project(view, reach.phi, 0, dims.shoulder);
  const e = project(view, reach.phi, er, ey);
  const w = project(view, reach.phi, wr, wy);
  res.shoulder.x = s.x;
  res.shoulder.y = s.y;
  res.elbow.x = e.x;
  res.elbow.y = e.y;
  res.wrist.x = w.x;
  res.wrist.y = w.y;
  return res;
}

/** Ajusta `to` por vueltas completas para que el giro desde `from` sea el más corto. */
export function nearestAngle(from: number, to: number) {
  return to + Math.PI * 2 * Math.round((from - to) / (Math.PI * 2));
}

// ── Pistas de animación (Hero) ───────────────────────────────────────────────

/** Curva de un tramo: `io` arranca y frena suave; `lin` es velocidad constante (seguir la cinta). */
export type Ease = "io" | "lin";
/** Clave de una pista: [segundo, valor, curva del tramo que TERMINA en esta clave]. */
export type Key = readonly [number, number, Ease?];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Valor de una pista en el segundo `t` (antes de la primera clave o después de la última, se queda quieta). */
export function sample(track: readonly Key[], t: number) {
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, ease = "io"] = track[i];
    if (t <= t1) {
      const [t0, v0] = track[i - 1];
      const k = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * (ease === "lin" ? k : easeInOut(k));
    }
  }
  return track[track.length - 1][1];
}

/** ¿El usuario pidió movimiento reducido? (se mide una vez: es una preferencia del sistema) */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
