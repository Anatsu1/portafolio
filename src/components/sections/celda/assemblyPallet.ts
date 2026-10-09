import { BELT_TOP, LINE_BOX_HALF_H, LOOP_PERIOD, PICK_PHASES, PICK_X, RUN_Z, WALL_Z, boxAt, type BoxState } from "./assemblyPath";

/*
 * Estación de paletizado (detrás del tramo frontal, a la izquierda del brazo
 * del laboratorio). Igual que las cajas de la cinta, todo es una función pura
 * del tiempo: no hay estado que se desincronice, el ciclo es exacto y
 * cualquier instante se puede reproducir en una captura.
 *
 * Ciclo:
 *  1. Una caja desviada llega al tope (assemblyPath: PICKED_BOXES) → evento n.
 *  2. El brazo baja, la toma, la lleva al pallet y la apoya en su lugar.
 *  3. Con 8 cajas (dos capas de 2 × 2) el pallet está lleno: sale el
 *     autoelevador por la puerta del fondo, se lo lleva y trae uno vacío.
 *
 * Las llegadas se repiten cada LOOP_PERIOD (todas las cajas dan una vuelta);
 * hay 4 por vuelta, así que el autoelevador sale cada dos vueltas (~2 min).
 * START_FILL arranca con la primera capa ya puesta para que el primer cambio
 * de pallet se vea en el primer minuto.
 */

// ------------------------------------------------------------- disposición --

/** Pie del brazo paletizador. */
export const ROBOT_POS = { x: PICK_X, z: -6.85 };
/** Centro del pallet en la estación (las tablas miden 1 × 1). */
export const PALLET_POS = { x: -1.3, z: -8.15 };
export const PALLET_H = 0.144;
export const PALLET_CAP = 8;
const START_FILL = 4;

/** Lugar del pallet `slot` (0..7) en coordenadas del pallet: lejanos primero. */
export function slotOffset(slot: number): [number, number, number] {
  const layer = Math.floor(slot / 4);
  const i = slot % 4;
  const x = (i % 2 === 0 ? -1 : 1) * 0.235;
  const z = (i < 2 ? -1 : 1) * 0.228;
  return [x, PALLET_H + LINE_BOX_HALF_H + layer * 0.402, z];
}

/** Giro de cada caja en el pallet: leve (que no parezca una grilla) y alguna de espaldas. */
export function slotYaw(slot: number) {
  return Math.sin(slot * 91.7) * 0.035 + (slot % 3 === 1 ? Math.PI : 0);
}

/** Altura de la tapa de una caja respecto de su origen (el modelo baja 0,82 y sube 0,88). */
export const BOX_TOP_ABOVE_ORIGIN = 0.88 * 0.235;

// --------------------------------------------------------------- eventos --

const M = PICK_PHASES.length;

/** Segundo en que la n-ésima caja desviada toca el tope. */
export function eventTime(n: number) {
  return Math.floor(n / M) * LOOP_PERIOD + PICK_PHASES[n % M].phase;
}

/** Cantidad de eventos ocurridos hasta `t` inclusive (n ≥ 0). */
function eventsUntil(t: number) {
  if (t < 0) return 0;
  const c = Math.floor(t / LOOP_PERIOD);
  const rest = t - c * LOOP_PERIOD;
  let k = 0;
  while (k < M && PICK_PHASES[k].phase <= rest) k++;
  return c * M + k;
}

// --------------------------------------------------------- ciclo del brazo --

/*
 * Tiempos de un ciclo (s, desde que la caja toca el tope). El brazo espera
 * arriba del tope, así que no hay movimiento previo a la llegada.
 */
export const ARM = {
  down: 0.7, // bajó sobre la caja
  grip: 1.0, // mordazas cerradas; la caja deja la cinta (= PICK_HOLD)
  up: 1.6, // subió a la altura de traslado
  over: 3.2, // está sobre el lugar del pallet
  set: 3.9, // apoyó la caja
  place: 4.15, // soltó: desde acá la caja es del pallet
  clear: 4.7, // subió
  home: 6.3, // volvió a esperar sobre el tope
} as const;

/** Altura de la tapa de la caja cuando está frenada en la cinta. */
export const PICK_TOP_Y = BELT_TOP + LINE_BOX_HALF_H + BOX_TOP_ABOVE_ORIGIN;
/** Altura de la herramienta (tapa de la caja) durante el traslado. */
export const CARRY_Y = 1.62;

export type ArmEvent = {
  /** Índice del evento activo (−1 = esperando). */
  n: number;
  /** Segundos desde que la caja tocó el tope. */
  tau: number;
  /** Lugar del pallet al que va la caja. */
  slot: number;
  /** Giro de la caja sobre la cinta (la pinza se alinea con él). */
  yaw: number;
  /** La caja viene de espaldas (π) o no (0). */
  flip: number;
};

const scratch: BoxState = { s: 0, visible: false, jitter: 0, flip: 0, lap: 0, held: false };

/** Qué está haciendo el brazo en `t`. */
export function armEvent(t: number, out: ArmEvent): ArmEvent {
  const n = eventsUntil(t) - 1;
  out.n = -1;
  out.tau = 0;
  if (n < 0) return out;
  const tau = t - eventTime(n);
  if (tau >= ARM.home) return out;
  out.n = n;
  out.tau = tau;
  out.slot = (START_FILL + n) % PALLET_CAP;
  boxAt(PICK_PHASES[n % M].k, eventTime(n) + 0.01, scratch);
  out.yaw = scratch.jitter;
  out.flip = scratch.flip;
  return out;
}

// ------------------------------------------------------------- autoelevador --

/*
 * Recorrido del autoelevador (punto de referencia: talón de las uñas, en el
 * mástil). Sale del túnel de la puerta C hacia la cámara, dobla 90° y avanza
 * hacia −X hasta calzar las uñas en el pallet; vuelve marcha atrás por el
 * mismo camino.
 */
export const FORK_DOOR_X = 1.6;
const TURN_R = 1.2;
const LANE_Z = PALLET_POS.z;
const TURN_Z = LANE_Z - TURN_R; // donde empieza a doblar
const START_Z = WALL_Z - 3.0; // escondido dentro del túnel
const ENGAGE_X = PALLET_POS.x + 0.53; // talón contra el borde +X del pallet
const LEG_A = TURN_Z - START_Z;
const LEG_B = (Math.PI / 2) * TURN_R;
const LEG_C = FORK_DOOR_X - TURN_R - ENGAGE_X;
const PATH = LEG_A + LEG_B + LEG_C;
const STAGE = 1.1; // espera con las uñas fuera del pallet

/** Altura de elevación de las uñas con carga. */
export const FORK_LIFT = 0.13;

/** Fases del cambio de pallet, en segundos desde que el pallet se llenó. */
const FK = {
  start: -4.5,
  staged: 0.3,
  engaged: 1.1, // empieza a levantar: el pallet pasa a las uñas
  lifted: 2.1,
  out: 6.8,
  back: 8.3, // vuelve con uno vacío
  arrived: 13.0,
  lowered: 14.0, // el pallet nuevo queda en la estación
  gone: 18.7,
} as const;

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};
const span = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

export type ForkState = {
  visible: boolean;
  x: number;
  z: number;
  yaw: number;
  /** Elevación de las uñas (0..FORK_LIFT). */
  lift: number;
  /** Qué lleva en las uñas. */
  load: "none" | "full" | "empty";
  /** Avance (para girar las ruedas): distancia recorrida en el camino. */
  u: number;
  /** Apertura de la persiana de la puerta C (0 cerrada, 1 arriba). */
  door: number;
};

function placeOnPath(u: number, out: ForkState) {
  out.u = u;
  if (u <= LEG_A) {
    out.x = FORK_DOOR_X;
    out.z = START_Z + u;
    out.yaw = -Math.PI / 2; // +X local mirando a +Z
  } else if (u <= LEG_A + LEG_B) {
    const a = (u - LEG_A) / TURN_R;
    out.x = FORK_DOOR_X - TURN_R + TURN_R * Math.cos(a);
    out.z = TURN_Z + TURN_R * Math.sin(a);
    out.yaw = -Math.PI / 2 - a;
  } else {
    out.x = FORK_DOOR_X - TURN_R - (u - LEG_A - LEG_B);
    out.z = LANE_Z;
    out.yaw = -Math.PI;
  }
}

/** Tiempo (s) en que el pallet `q` (0, 1, …) quedó lleno. */
function fullTime(q: number) {
  return eventTime(q * PALLET_CAP + PALLET_CAP - START_FILL - 1) + ARM.place;
}

export type StationState = {
  /** Hay pallet en la estación. */
  pallet: boolean;
  /** Cajas apoyadas en el pallet de la estación. */
  boxes: number;
  fork: ForkState;
};

/** Estado de la estación (pallet + autoelevador) en `t`. */
export function stationAt(t: number, out: StationState): StationState {
  const total = START_FILL + eventsUntil(t - ARM.place);
  const full = Math.floor(total / PALLET_CAP);
  const f = out.fork;
  f.visible = false;
  f.load = "none";
  f.lift = 0;
  f.door = 0;
  out.pallet = true;
  out.boxes = total % PALLET_CAP;

  // Cambio en curso: el del último pallet lleno o el que está por empezar.
  let tau = Infinity;
  if (full >= 1 && t - fullTime(full - 1) < FK.gone + 2) tau = t - fullTime(full - 1);
  else if (t - fullTime(full) >= FK.start - 1.5) tau = t - fullTime(full);
  if (!Number.isFinite(tau)) return out;

  if (tau < FK.engaged) {
    if (full >= 1 && tau >= 0) out.boxes = PALLET_CAP;
  } else if (tau < FK.lowered) out.pallet = false;

  f.door = span(tau, FK.start - 1.5, FK.start) * (1 - span(tau, FK.gone, FK.gone + 1.5));
  if (tau < FK.start || tau > FK.gone) return out;
  f.visible = true;
  let u: number;
  if (tau < FK.staged) u = (PATH - STAGE) * span(tau, FK.start, FK.staged);
  else if (tau < FK.lifted) u = PATH - STAGE + STAGE * span(tau, FK.staged, FK.engaged);
  else if (tau < FK.back) u = PATH * (1 - span(tau, FK.lifted, FK.out));
  else if (tau < FK.lowered) u = PATH * span(tau, FK.back, FK.arrived);
  else u = PATH * (1 - span(tau, FK.lowered, FK.gone));
  placeOnPath(u, f);

  if (tau >= FK.engaged && tau < FK.out + 0.5) {
    f.load = "full";
    f.lift = FORK_LIFT * span(tau, FK.engaged, FK.lifted);
  } else if (tau >= FK.back - 0.5 && tau < FK.lowered) {
    f.load = "empty";
    f.lift = FORK_LIFT * (1 - span(tau, FK.arrived, FK.lowered));
  }
  return out;
}

export function newStationState(): StationState {
  return { pallet: true, boxes: 0, fork: { visible: false, x: 0, z: 0, yaw: 0, lift: 0, load: "none", u: 0, door: 0 } };
}

/** Tope del tramo frontal: baja antes de que llegue una caja desviada y sube cuando se la llevan. */
export function stopperDown(t: number) {
  const done = eventsUntil(t);
  const lowering = span(t, eventTime(done) - 1.6, eventTime(done) - 1.2);
  if (done === 0) return lowering;
  const prev = eventTime(done - 1);
  return Math.max(lowering, 1 - span(t, prev + 1.3, prev + 1.7));
}

export const RUN_PICK = { x: PICK_X, z: RUN_Z };
