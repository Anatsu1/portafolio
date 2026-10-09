/*
 * Recorrido de la línea de montaje (entorno "linea").
 *
 * La cinta tiene forma de U detrás del brazo: las cajas salen por la puerta de
 * carga izquierda de la pared del fondo, vienen hacia la cámara, doblan, pasan
 * por detrás del brazo (z = RUN_Z) atravesando las estaciones y vuelven a
 * entrar a la pared por la puerta derecha. Todo en el plano XZ; la altura la
 * pone quien dibuja.
 *
 * Las cajas no guardan estado: su posición es una función pura del tiempo
 * (`boxAt`). Así no se acumulan errores, el bucle es perfecto y cualquier
 * instante se puede reproducir (útil para las capturas de prueba).
 */

// --- trazado (unidades de la escena; el brazo está en el origen) ---
export const IN_X = -5.6; // pata de entrada (puerta izquierda)
export const OUT_X = 5.6; // pata de salida (puerta derecha)
export const RUN_Z = -5.1; // tramo frontal, detrás del brazo (radio libre ≥ 5)
export const CURVE_R = 1.1; // radio de las curvas de rodillos
export const WALL_Z = -9.6; // cara de la pared del fondo
export const TUNNEL_Z = -11.8; // las cajas nacen y mueren dentro del túnel

// --- cinta ---
export const BELT_TOP = 0.72; // altura de la superficie de la cinta
export const BELT_W = 1.05; // ancho útil de la banda
export const BELT_SPEED = 0.55; // unidades por segundo

// --- cajas sobre la cinta ---
export const LINE_BOX_SCALE = 0.235; // la caja del brazo usa 0,26
export const LINE_BOX_HALF_H = 0.82 * LINE_BOX_SCALE; // el modelo baja 0,82 desde su centro

type Seg =
  | { kind: "line"; x0: number; z0: number; x1: number; z1: number; len: number }
  | { kind: "arc"; cx: number; cz: number; a0: number; a1: number; len: number };

function line(x0: number, z0: number, x1: number, z1: number): Seg {
  return { kind: "line", x0, z0, x1, z1, len: Math.hypot(x1 - x0, z1 - z0) };
}
function arc(cx: number, cz: number, a0: number, a1: number): Seg {
  return { kind: "arc", cx, cz, a0, a1, len: Math.abs(a1 - a0) * CURVE_R };
}

export const SEGMENTS: readonly Seg[] = [
  line(IN_X, TUNNEL_Z, IN_X, RUN_Z - CURVE_R),
  arc(IN_X + CURVE_R, RUN_Z - CURVE_R, Math.PI, Math.PI / 2),
  line(IN_X + CURVE_R, RUN_Z, OUT_X - CURVE_R, RUN_Z),
  arc(OUT_X - CURVE_R, RUN_Z - CURVE_R, Math.PI / 2, 0),
  line(OUT_X, RUN_Z - CURVE_R, OUT_X, TUNNEL_Z),
];

export const PATH_LEN = SEGMENTS.reduce((sum, s) => sum + s.len, 0);

/** Distancia recorrida (desde el inicio del túnel de entrada) al llegar a cada tramo. */
const STARTS = SEGMENTS.reduce<number[]>((acc, _s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SEGMENTS[i - 1].len], []);

/** Coordenada `s` sobre el tramo frontal para una x dada (las estaciones están ahí). */
export function sOnRun(x: number) {
  return STARTS[2] + (x - (IN_X + CURVE_R));
}

export type PathPoint = { x: number; z: number; yaw: number };

/**
 * Punto del recorrido a la distancia `s`. `yaw` es la rotación sobre Y que
 * alinea el +X local con el sentido de avance (convención de three).
 */
export function pointAt(s: number, out: PathPoint = { x: 0, z: 0, yaw: 0 }): PathPoint {
  let i = SEGMENTS.length - 1;
  while (i > 0 && s < STARTS[i]) i--;
  const seg = SEGMENTS[i];
  const t = Math.min(Math.max((s - STARTS[i]) / seg.len, 0), 1);
  if (seg.kind === "line") {
    out.x = seg.x0 + (seg.x1 - seg.x0) * t;
    out.z = seg.z0 + (seg.z1 - seg.z0) * t;
    out.yaw = Math.atan2(-(seg.z1 - seg.z0), seg.x1 - seg.x0);
  } else {
    const a = seg.a0 + (seg.a1 - seg.a0) * t;
    out.x = seg.cx + CURVE_R * Math.cos(a);
    out.z = seg.cz + CURVE_R * Math.sin(a);
    // Tangente en el sentido de avance (a decreciente): (sin a, −cos a)
    out.yaw = Math.atan2(Math.cos(a), Math.sin(a));
  }
  return out;
}

// --- cronograma de las cajas ---

/** Generador determinístico: el mismo patrón en cada carga de la página. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const LINE_BOX_COUNT = 13;

/**
 * Las cajas recorren un bucle más largo que la cinta: el excedente es el
 * tiempo que pasan "adentro" de la pared (ocultas). Los huecos entre cajas
 * son irregulares (1,5 a 3,1 unidades) para que no parezca un desfile.
 */
const GAPS = Array.from({ length: LINE_BOX_COUNT }, (_, i) => 1.5 + hash(i + 1) * 1.6);
const LOOP_LEN = GAPS.reduce((a, b) => a + b, 0);
const OFFSETS = GAPS.map((_, i) => GAPS.slice(0, i).reduce((a, b) => a + b, 0));

// --- desvío al paletizador ---

/*
 * Algunas cajas no siguen a la selladora: en el tramo frontal un tope las
 * frena (la banda sigue corriendo por debajo), el brazo paletizador las toma y
 * las apila en un pallet (ver assemblyPallet.ts). Se eligieron a mano mirando
 * GAPS: el hueco que traen detrás es ≥ 2,5 (la que sigue no las alcanza
 * mientras esperan) y sus llegadas dejan ~25 s libres por vuelta para que el
 * autoelevador cambie el pallet.
 */
export const PICK_X = -2.45;
export const PICK_S = sOnRun(PICK_X);
/** Segundos que la caja espera frenada antes de que el brazo la levante. */
export const PICK_HOLD = 1.0;
export const PICKED_BOXES: readonly number[] = [3, 0, 10, 8];

// El cronograma del paletizador supone que el bucle no se estira (ver boxAt).
if (LOOP_LEN < PATH_LEN) throw new Error("assemblyPath: el bucle de cajas es más corto que la cinta");

/** Segundos que tarda el bucle completo de cajas (una vuelta de cada una). */
export const LOOP_PERIOD = LOOP_LEN / BELT_SPEED;

/**
 * Llegadas al tope dentro de cada vuelta, ordenadas: `phase` es el segundo
 * (0…LOOP_PERIOD) en que la caja `k` toca el tope. Se repiten cada LOOP_PERIOD.
 */
export const PICK_PHASES = PICKED_BOXES.map((k) => ({
  k,
  phase: ((((PICK_S - OFFSETS[k]) % LOOP_LEN) + LOOP_LEN) % LOOP_LEN) / BELT_SPEED,
})).sort((a, b) => a.phase - b.phase);

export type BoxState = { s: number; visible: boolean; jitter: number; flip: number; lap: number; held: boolean };

/** Estado de la caja `k` en el tiempo `t` (segundos). */
export function boxAt(k: number, t: number, out: BoxState): BoxState {
  const d = t * BELT_SPEED + OFFSETS[k];
  const lap = Math.floor(d / LOOP_LEN);
  const s = d - lap * LOOP_LEN;
  // El bucle es más largo que la cinta: las que "sobran" esperan en el túnel.
  out.s = (s / LOOP_LEN) * Math.max(LOOP_LEN, PATH_LEN);
  out.visible = out.s <= PATH_LEN;
  out.lap = lap;
  out.held = false;
  // Cada vuelta la caja vuelve con otro giro leve y, a veces, de espaldas.
  const h = hash(k * 31 + lap * 7);
  out.jitter = (h - 0.5) * 0.22;
  out.flip = hash(k * 13 + lap * 3) > 0.7 ? Math.PI : 0;
  // Las desviadas quedan frenadas en el tope y después se las lleva el brazo
  // (desde ahí las dibuja el paletizador). Vuelven a salir del túnel la
  // vuelta siguiente, como las demás.
  if (out.visible && out.s > PICK_S && PICKED_BOXES.includes(k)) {
    if (out.s - PICK_S < PICK_HOLD * BELT_SPEED) {
      out.s = PICK_S;
      out.held = true;
    } else out.visible = false;
  }
  return out;
}

const scratch: BoxState = { s: 0, visible: false, jitter: 0, flip: 0, lap: 0, held: false };

/**
 * Lo que ve una estación ubicada en `s0` en el tiempo `t`: distancia con
 * signo a la caja más cercana (negativa = todavía no llegó) y cuántas cajas
 * pasaron ya por ahí desde que arrancó la línea (para el contador).
 */
export function stationView(s0: number, t: number) {
  let near = Infinity;
  let count = 0;
  for (let k = 0; k < LINE_BOX_COUNT; k++) {
    boxAt(k, t, scratch);
    count += scratch.lap + (scratch.s > s0 ? 1 : 0);
    if (!scratch.visible) continue;
    const d = scratch.s - s0;
    if (Math.abs(d) < Math.abs(near)) near = d;
  }
  return { near, count };
}
