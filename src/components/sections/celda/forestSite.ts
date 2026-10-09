/**
 * Plano del "puesto de campo": dónde va cada pieza industrial instalada en el
 * claro del bosque (cinta, contenedor con paneles solares, generador, mástiles de
 * luz, consola, barrera y antena) y por dónde corren los cables. Solo datos,
 * sin three: lo usan el que construye la geometría (`forestIndustry.ts`) y el
 * que reparte la vegetación (`forestScatter.ts`), para que ningún árbol ni
 * arbusto crezca encima de una máquina.
 *
 * Reglas de composición (ver docs/plan-brazo-3d.md):
 *  - Nada industrial a menos de 5,5 del brazo (salvo cables en el piso).
 *  - Nada delante del brazo (z > 3): ahí está la cámara.
 *  - Lo importante a la izquierda/fondo: el panel HTML tapa el 42 % derecho y
 *    corre la vista a la izquierda, así que la derecha es "decorado secundario".
 */

export type XZ = readonly [number, number];

// ---- Cinta transportadora --------------------------------------------------------

/**
 * La cinta corre paralela al sendero, del lado del brazo: nace en el
 * contenedor del fondo (FAR) y termina en la estación de recepción (NEAR), al
 * borde del claro. Las cajas viajan de FAR a NEAR.
 */
export const BELT = {
  far: [-4.35, -12.2] as XZ,
  near: [-3.55, -5.45] as XZ,
  top: 0.62, // altura de la banda
  width: 0.78, // ancho útil de la banda
  speed: 0.42, // unidades por segundo
};

/** Dirección de avance de las cajas (de FAR a NEAR), unitaria, y largo de la cinta. */
export const BELT_LEN = Math.hypot(BELT.near[0] - BELT.far[0], BELT.near[1] - BELT.far[1]);
export const BELT_DIR: XZ = [(BELT.near[0] - BELT.far[0]) / BELT_LEN, (BELT.near[1] - BELT.far[1]) / BELT_LEN];

/**
 * Contenedor de carga del que salen las cajas: alineado con la cinta, con la
 * boca abierta hacia ella; la cinta se mete medio metro adentro.
 */
const CONTAINER_LEN = 4.6;
export const CONTAINER = {
  at: [BELT.far[0] - BELT_DIR[0] * (CONTAINER_LEN / 2 - 0.5), BELT.far[1] - BELT_DIR[1] * (CONTAINER_LEN / 2 - 0.5)] as XZ,
  len: CONTAINER_LEN,
  wid: 2.3,
  hgt: 2.45,
};

/** Estación de recepción al final de la cinta (las cajas entran y desaparecen). */
export const STATION = { at: BELT.near, len: 1.3 };

// ---- Equipos ---------------------------------------------------------------------

/** Consola del operador, mirando al brazo. */
export const KIOSK = { at: [-1.75, -5.95] as XZ };

/** Grupo electrógeno sobre patín, con su tablero y el cerco. */
export const GENERATOR = { at: [5.35, -5.6] as XZ, rotY: -0.75 };

/** Mástiles de iluminación (reflectores apuntando a la plataforma). */
export const MASTS: readonly { at: XZ; height: number }[] = [
  { at: [-6.05, -1.55], height: 4.4 },
  { at: [4.55, -3.65], height: 4.0 },
];

/**
 * Barrera de acceso sobre el sendero, del lado de afuera: la pluma (levantada)
 * cruza el sendero hacia el este. `rotY` alinea su +X local con esa dirección.
 */
export const GATE = { at: [-6.25, -4.55] as XZ, rotY: 0.44, armLen: 2.4 };

/** Mástil de antena con parábola (fondo a la derecha). Los paneles solares van sobre el contenedor. */
export const ANTENNA = { at: [6.9, -8.9] as XZ, height: 6.2 };

/**
 * Cables apoyados en el pasto: polilíneas en XZ (el builder las suaviza y
 * las apoya en el suelo). Van de la plataforma a cada equipo.
 */
export const CABLES: readonly XZ[][] = [
  // plataforma → consola
  [[-1.05, -3.25], [-1.25, -4.1], [-1.5, -4.9], [-1.62, -5.5]],
  // plataforma → generador (dos cables juntos)
  [[2.5, -2.3], [3.3, -3.0], [4.1, -4.2], [4.7, -4.95]],
  [[2.62, -2.16], [3.5, -2.75], [4.3, -4.0], [4.88, -4.8]],
  // generador → mástil derecho
  [[4.9, -4.75], [4.75, -4.3], [4.6, -3.9]],
  // consola → estación de recepción
  [[-2.1, -5.95], [-2.6, -5.9], [-3.0, -5.7]],
  // plataforma → mástil izquierdo
  [[-3.25, -0.95], [-4.1, -1.25], [-5.0, -1.45], [-5.85, -1.5]],
  // estación → barrera: cruza el sendero bajo una rampa
  [[-3.95, -5.15], [-4.6, -4.85], [-5.4, -4.7], [-6.05, -4.6]],
];

/** Rampa protectora donde el cable de la barrera cruza el sendero (+X local = largo). */
export const RAMP = { at: [-5.0, -4.77] as XZ, rotY: 0.19, len: 1.7 };

// ---- Huellas: lo que la vegetación tiene que esquivar -------------------------

/** Distancia de un punto a un segmento en XZ. */
export function segDistance(x: number, z: number, a: XZ, b: XZ) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

/** Círculos (x, z, radio) que ocupan las máquinas. */
const SPOTS: readonly [number, number, number][] = [
  [STATION.at[0], STATION.at[1], 1.0],
  [KIOSK.at[0], KIOSK.at[1], 0.9],
  [GENERATOR.at[0], GENERATOR.at[1], 2.0],
  [GATE.at[0], GATE.at[1], 0.6],
  [ANTENNA.at[0], ANTENNA.at[1], 1.1],
  ...MASTS.map((m): [number, number, number] => [m.at[0], m.at[1], 0.7]),
];

/**
 * Cuánto lugar libre hay entre (x, z) y la máquina más cercana (negativo =
 * adentro). La cinta y el contenedor cuentan como "cápsulas" a lo largo de su eje.
 */
export function siteClearance(x: number, z: number) {
  let d = segDistance(x, z, BELT.far, BELT.near) - 0.75;
  const c = CONTAINER;
  const [ux, uz] = BELT_DIR;
  const a: XZ = [c.at[0] - (ux * c.len) / 2, c.at[1] - (uz * c.len) / 2];
  const b: XZ = [c.at[0] + (ux * c.len) / 2, c.at[1] + (uz * c.len) / 2];
  d = Math.min(d, segDistance(x, z, a, b) - c.wid / 2 - 0.3);
  for (const [sx, sz, r] of SPOTS) d = Math.min(d, Math.hypot(x - sx, z - sz) - r);
  return d;
}

/** Distancia al cable más cercano (para no poner rocas o troncos encima). */
export function cableDistance(x: number, z: number) {
  let best = Infinity;
  for (const line of CABLES) for (let i = 0; i < line.length - 1; i++) best = Math.min(best, segDistance(x, z, line[i], line[i + 1]));
  return best;
}

/**
 * Zonas donde lo orgánico invade la plataforma de acero: ángulo (rad, en XZ
 * con atan2(z, x)) y ancho angular. Ahí el pasto, el musgo y alguna piedra se
 * meten sobre el borde de la chapa.
 */
export const INVASIONS: readonly { angle: number; spread: number; depth: number }[] = [
  { angle: Math.atan2(-1.9, -2.6), spread: 0.55, depth: 0.75 }, // donde llega el sendero
  { angle: Math.atan2(1.6, -3.0), spread: 0.4, depth: 0.5 }, // adelante a la izquierda
  { angle: Math.atan2(-2.9, 1.6), spread: 0.35, depth: 0.45 }, // fondo a la derecha
  { angle: Math.atan2(0.9, 3.3), spread: 0.3, depth: 0.4 }, // derecha
];

/** 0..1: cuánto avanza la invasión vegetal en el ángulo `a` (atan2(z, x)). */
export function invasionAt(a: number) {
  let best = 0;
  for (const inv of INVASIONS) {
    let d = Math.abs(a - inv.angle);
    if (d > Math.PI) d = Math.PI * 2 - d;
    const k = Math.max(0, 1 - d / inv.spread);
    best = Math.max(best, k * k * (3 - 2 * k) * inv.depth);
  }
  return best;
}
