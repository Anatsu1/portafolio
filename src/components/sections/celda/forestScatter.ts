import { CAMERA_POS, CAMERA_TARGET } from "./cellLayout";

/**
 * Datos del bosque (sin three): relieve suave, sendero, mezcla de suelos y dónde
 * va cada árbol y cada elemento del sotobosque. Todo es determinístico, así
 * el bosque sale siempre igual y se puede componer mirando capturas.
 */

/** Generador pseudoaleatorio determinístico (mulberry32). */
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor 2D suave, en [0, 1]. */
function noise2(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, seed = 0, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export function smoothstep(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Radio despejado alrededor del brazo (la plataforma mide 3,4). */
/** Radio despejado alrededor del brazo (la plataforma mide 3,4). */
export const CLEAR_R = 5.8;

/**
 * Relieve: plano bajo la celda y lomas suaves alrededor que suben un poco
 * hacia el fondo, así el piso del bosque llena el fondo del encuadre.
 */
export function groundHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const t = smoothstep(8, 20, r);
  if (t === 0) return 0;
  const hills = (fbm(x * 0.045 + 3, z * 0.05 - 5, 1, 3) - 0.5) * 2.2;
  const back = smoothstep(6, 50, -z) * 2.6;
  return t * (hills + back);
}

// ---- Sendero ------------------------------------------------------------------

/** Sendero de tierra que sale del claro y se mete en el bosque hacia el fondo a la izquierda. */
const PATH: [number, number][] = [
  [-2.6, -1.9],
  [-4.6, -3.6],
  [-6.0, -6.6],
  [-5.4, -10.2],
  [-6.6, -13.8],
  [-9.4, -17.6],
  [-10.6, -23],
  [-9.6, -31],
  [-11, -40],
];

export function pathDistance(x: number, z: number) {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i];
    const [bx, bz] = PATH[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/** 1 sobre el sendero, 0 fuera; el borde es irregular. */
export function pathAmount(x: number, z: number) {
  const edge = (fbm(x * 0.9, z * 0.9, 33, 2) - 0.5) * 0.45;
  return 1 - smoothstep(0.5, 0.85, pathDistance(x, z) + edge);
}

/** Pasto: el claro alrededor de la celda y manchones donde entra el sol. */
export function grassAmount(x: number, z: number) {
  const r = Math.hypot(x, z);
  const clearing = smoothstep(3.4, 4.2, r) * (1 - smoothstep(9, 15, r));
  const patches = smoothstep(0.42, 0.62, fbm(x * 0.08 - 7, z * 0.08 + 13, 9, 4));
  return clamp01(Math.max(clearing, patches * 0.9)) * (1 - pathAmount(x, z));
}

// ---- Encuadre -------------------------------------------------------------

const FWD = (() => {
  const dx = CAMERA_TARGET.x - CAMERA_POS.x;
  const dz = CAMERA_TARGET.z - CAMERA_POS.z;
  const l = Math.hypot(dx, dz);
  return { x: dx / l, z: dz / l };
})();

/**
 * Ángulo horizontal (rad) de un punto respecto del eje de la cámara, positivo
 * a la derecha, y distancia horizontal. Sirve para poblar solo lo que se ve:
 * fuera de ese abanico no vale la pena gastar triángulos.
 */
export function viewOf(x: number, z: number) {
  const dx = x - CAMERA_POS.x;
  const dz = z - CAMERA_POS.z;
  const along = dx * FWD.x + dz * FWD.z;
  const side = dx * -FWD.z + dz * FWD.x;
  return { angle: Math.atan2(side, along), dist: Math.hypot(dx, dz) };
}

/** Dentro del abanico visible. A la derecha hay más margen: el panel corre la vista. */
export function inView(x: number, z: number, pad = 0) {
  const { angle } = viewOf(x, z);
  return angle > -0.78 - pad && angle < 0.98 + pad;
}

// ---- Árboles y arbustos ----------------------------------------------------------

export type TreeKind = "oak" | "round" | "small" | "far";
export type Tree = { kind: TreeKind; x: number; y: number; z: number; scale: number; rotY: number; tiltX: number; tiltZ: number };

/** Distancia a la cámara a partir de la cual los troncos pasan a la versión simple. */
const NEAR_DIST = 30;
const MAX_DIST = 78;

export function placeTrees(): Tree[] {
  const rand = rng(1234);
  const trees: Tree[] = [];
  const fits = (x: number, z: number, d: number) => trees.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > d * d);
  const add = (kind: TreeKind, x: number, z: number, scale: number, tilt = 0.05) =>
    trees.push({
      kind,
      x,
      z,
      y: groundHeight(x, z) - 0.1,
      scale,
      rotY: rand() * Math.PI * 2,
      tiltX: (rand() - 0.5) * tilt,
      tiltZ: (rand() - 0.5) * tilt,
    });

  // Ejemplares fijos que arman la composición: un roble grande que enmarca a
  // la izquierda, otro a la derecha y uno de fondo detrás del brazo.
  add("oak", -8.4, -2.2, 1.15, 0.02);
  add("round", 9.6, -4.2, 1.05, 0.02);
  add("oak", 3.8, -12.5, 1.1, 0.02);
  add("small", -1.2, -9.4, 0.9, 0.04);

  for (let i = 0; i < 14000; i++) {
    const x = -55 + rand() * 115;
    const z = -75 + rand() * 78;
    if (z > 2.2) continue;
    const r = Math.hypot(x, z);
    if (r < CLEAR_R + 2.2) continue;
    if (pathDistance(x, z) < 2.2) continue;
    if (!inView(x, z, 0.05)) continue;
    const { dist } = viewOf(x, z);
    if (dist > MAX_DIST) continue;
    const near = dist < NEAR_DIST;
    if (!fits(x, z, near ? 4.2 : 3.6)) continue;
    let kind: TreeKind = "far";
    if (near) {
      const k = rand();
      kind = k < 0.45 ? "oak" : k < 0.8 ? "round" : "small";
    }
    add(kind, x, z, 0.8 + rand() * 0.4);
  }
  return trees;
}

export type Prop = { x: number; y: number; z: number; scale: number; rotY: number; tone: number; variant: number; tiltX?: number; tiltZ?: number; sy?: number };

/** Punto al azar dentro de un anillo (en xz), con más densidad cerca. */
const ring = (rMin: number, rMax: number) => (rand: () => number): [number, number] => {
  const a = rand() * Math.PI * 2;
  const r = rMin + (rMax - rMin) * Math.pow(rand(), 0.8);
  return [Math.cos(a) * r, Math.sin(a) * r];
};

/** Fuera del pasillo entre la cámara y el brazo. */
const outOfCorridor = (x: number, z: number) => !(z > 3.4 && x > -4.5 && x < 6.5);

function scatter(
  seed: number,
  count: number,
  attempts: number,
  sample: (rand: () => number) => [number, number],
  accept: (x: number, z: number, rand: () => number) => boolean,
  make: (x: number, z: number, rand: () => number) => Partial<Prop> & { scale: number }
) {
  const rand = rng(seed);
  const out: Prop[] = [];
  for (let i = 0; i < attempts && out.length < count; i++) {
    const [x, z] = sample(rand);
    if (!inView(x, z, 0.08) || !outOfCorridor(x, z)) continue;
    if (!accept(x, z, rand)) continue;
    out.push({ x, z, y: groundHeight(x, z), rotY: rand() * Math.PI * 2, tone: rand(), variant: 0, ...make(x, z, rand) });
  }
  return out;
}

export function placeUndergrowth(trees: Tree[]) {
  const nearTrees = trees.filter((t) => t.kind !== "far");
  const nearTrunk = (x: number, z: number, d: number) => nearTrees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < d * d);
  const offPath = (x: number, z: number, d = 1.1) => pathDistance(x, z) > d;

  // Arbustos: bordean el claro y rellenan el bosque (también lejos, bajo la bruma).
  const bushes: Prop[] = [];
  {
    const rand = rng(99);
    for (let i = 0; i < 9000 && bushes.length < 120; i++) {
      const [x, z] = ring(CLEAR_R + 1.6, 60)(rand);
      if (z > 1.5 || !inView(x, z, 0.05) || !offPath(x, z, 1.8)) continue;
      if (nearTrunk(x, z, 1.2)) continue;
      if (bushes.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < 4.4)) continue;
      const r = Math.hypot(x, z);
      const edge = smoothstep(CLEAR_R + 1.5, 9, r) * (1 - smoothstep(13, 18, r));
      if (rand() > 0.25 + edge * 0.6) continue;
      const far = viewOf(x, z).dist > NEAR_DIST;
      bushes.push({ x, z, y: groundHeight(x, z) - 0.05, scale: (far ? 1.2 : 0.75) + rand() * 0.6, rotY: rand() * Math.PI * 2, tone: rand(), variant: 0 });
    }
  }

  const grass = scatter(
    101,
    900,
    20000,
    ring(3.7, 30),
    (x, z, rand) => {
      const near = Math.hypot(x, z) < CLEAR_R ? 0.3 : 1; // dentro del claro, pocas y bajas
      return rand() < grassAmount(x, z) * 0.95 * near && !nearTrunk(x, z, 0.8);
    },
    (x, z, rand) => ({ scale: (Math.hypot(x, z) < CLEAR_R ? 0.5 : 0.85) + rand() * 0.6 })
  );

  // Flores silvestres en manchones de un mismo color (como crecen de verdad).
  const flowers = scatter(
    202,
    300,
    20000,
    ring(4.4, 24),
    (x, z, rand) => rand() < grassAmount(x, z) * smoothstep(0.42, 0.6, fbm(x * 0.22 + 5, z * 0.22 - 9, 21, 3)),
    (x, z, rand) => {
      const kind = Math.floor(fbm(x * 0.1 + 40, z * 0.1, 22, 2) * 6 * 1.6) % 3; // amarilla / violeta / roja
      return { scale: 0.8 + rand() * 0.5, variant: kind * 2 + (rand() > 0.5 ? 1 : 0) };
    }
  );

  const ferns = scatter(
    303,
    170,
    9000,
    ring(CLEAR_R + 1, 30),
    (x, z, rand) => z < 2.6 && offPath(x, z) && (nearTrunk(x, z, 4) ? rand() < 0.55 : rand() < 0.08),
    (_x, _z, rand) => ({ scale: 0.8 + rand() * 0.7 })
  );

  const rocks = scatter(
    404,
    34,
    6000,
    ring(CLEAR_R + 0.6, 26),
    (x, z, rand) => z < 2 && rand() < (pathDistance(x, z) < 1.8 ? 0.6 : 0.12),
    (x, z, rand) => {
      const large = rand() < 0.3;
      const scale = large ? 0.6 + rand() * 0.6 : 0.8 + rand() * 1.0;
      return { scale, variant: large ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 3), y: groundHeight(x, z) - 0.04 * scale };
    }
  );

  // Troncos caídos y tocones (Kenney), lejos de los troncos en pie.
  const logs: Prop[] = [];
  {
    const rand = rng(505);
    for (let i = 0; i < 4000 && logs.length < 11; i++) {
      const [x, z] = ring(CLEAR_R + 1.8, 22)(rand);
      if (z > 1 || !inView(x, z, -0.1) || !offPath(x, z, 1.6) || nearTrunk(x, z, 1.8)) continue;
      if (logs.some((l) => (l.x - x) ** 2 + (l.z - z) ** 2 < 20)) continue;
      // 0 = tronco grande, 1 = tronco chico, 2/3 = tocones
      const variant = logs.length < 3 ? 0 : logs.length < 5 ? 1 : 2 + (logs.length % 2);
      const scale = variant === 0 ? 2.6 + rand() : variant === 1 ? 2.4 + rand() : 2.2 + rand() * 0.8;
      logs.push({ x, z, y: groundHeight(x, z) - 0.03, scale, rotY: rand() * Math.PI * 2, tone: rand(), variant });
    }
  }

  // Hongos al pie de árboles y troncos.
  const anchors = [...nearTrees, ...logs];
  const mushrooms = scatter(
    606,
    48,
    6000,
    ring(CLEAR_R + 0.5, 22),
    (x, z, rand) => anchors.some((a) => (a.x - x) ** 2 + (a.z - z) ** 2 < 2.2) && rand() < 0.7,
    (_x, _z, rand) => ({ scale: 1.2 + rand() * 0.9, variant: Math.floor(rand() * 3) })
  );

  // Lajas sobre el sendero, cada ~0,9 m.
  const stones: Prop[] = [];
  {
    const rand = rng(707);
    for (let i = 0; i < PATH.length - 1; i++) {
      const [ax, az] = PATH[i];
      const [bx, bz] = PATH[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < len; s += 0.8 + rand() * 0.4) {
        const t = s / len;
        const x = ax + (bx - ax) * t + (rand() - 0.5) * 0.5;
        const z = az + (bz - az) * t + (rand() - 0.5) * 0.5;
        if (Math.hypot(x, z) < 3.7 || viewOf(x, z).dist > 34 || rand() < 0.25) continue;
        stones.push({ x, z, y: groundHeight(x, z) - 0.025, scale: 0.75 + rand() * 0.35, rotY: Math.atan2(bx - ax, bz - az) + (rand() - 0.5) * 0.8, tone: rand(), variant: 0 });
      }
    }
  }

  return { bushes, grass, flowers, ferns, rocks, logs, mushrooms, stones };
}

// ---- Mapa de suelo ------------------------------------------------------------

/** Lado del mundo (m) que cubre el mapa de mezcla del suelo, centrado en el origen. */
export const SPLAT_WORLD = 160;
export const SPLAT_SIZE = 256;

/**
 * Mapa RGBA del suelo: R = sendero, G = pasto, B = sin uso, A = sombra al pie
 * de los troncos (oclusión). El resto es hojarasca. El shader del suelo lo
 * muestrea en coordenadas de mundo.
 */
export function buildSplat(trees: Tree[]) {
  const n = SPLAT_SIZE;
  const data = new Uint8Array(n * n * 4);
  const cell = SPLAT_WORLD / n;
  const ao = new Float32Array(n * n);
  for (const t of trees) {
    const rad = (t.kind === "far" ? 2 : t.kind === "small" ? 2.4 : 4.2) * t.scale;
    const i0 = Math.floor((t.x + SPLAT_WORLD / 2 - rad) / cell);
    const j0 = Math.floor((t.z + SPLAT_WORLD / 2 - rad) / cell);
    const span = Math.ceil((rad * 2) / cell) + 1;
    for (let j = j0; j < j0 + span; j++) {
      for (let i = i0; i < i0 + span; i++) {
        if (i < 0 || j < 0 || i >= n || j >= n) continue;
        const x = -SPLAT_WORLD / 2 + (i + 0.5) * cell;
        const z = -SPLAT_WORLD / 2 + (j + 0.5) * cell;
        const d = Math.hypot(x - t.x, z - t.z) / rad;
        if (d < 1) ao[j * n + i] = Math.max(ao[j * n + i], (1 - d) ** 1.2);
      }
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -SPLAT_WORLD / 2 + (i + 0.5) * cell;
      const z = -SPLAT_WORLD / 2 + (j + 0.5) * cell;
      const k = (j * n + i) * 4;
      const a = ao[j * n + i];
      data[k] = Math.round(pathAmount(x, z) * 255);
      data[k + 1] = Math.round(grassAmount(x, z) * (1 - a * 0.85) * 255);
      data[k + 2] = 0;
      data[k + 3] = Math.round(a * 255);
    }
  }
  return data;
}

// ---- Haces de luz y partículas ------------------------------------------------

/** Puntos de apoyo de los haces de luz: claros entre árboles del fondo. */
export function shaftAnchors(trees: Tree[]) {
  const rand = rng(707);
  const out: { x: number; z: number; width: number; strength: number }[] = [];
  for (let i = 0; i < 2000 && out.length < 9; i++) {
    const x = -14 + rand() * 34;
    const z = -26 + rand() * 20;
    if (Math.hypot(x, z) < 8.5 || !inView(x, z, -0.15)) continue;
    if (trees.some((t) => t.kind !== "far" && (t.x - x) ** 2 + (t.z - z) ** 2 < 2.2)) continue;
    if (out.some((s) => Math.abs(s.x - x) < 2.6)) continue;
    out.push({ x, z, width: 0.9 + rand() * 1.9, strength: 0.45 + rand() * 0.55 });
  }
  return out;
}

/** Posiciones de luciérnagas / motas de polvo en el aire. */
export function airParticles(count: number) {
  const rand = rng(808);
  const out: number[] = [];
  const seeds: number[] = [];
  for (let i = 0; i < 6000 && out.length / 3 < count; i++) {
    const [x, z] = ring(CLEAR_R, 24)(rand);
    if (z > 2.5 || !inView(x, z, -0.1)) continue;
    out.push(x, groundHeight(x, z) + 0.25 + Math.pow(rand(), 1.6) * 2.6, z);
    seeds.push(rand());
  }
  return { positions: new Float32Array(out), seeds: new Float32Array(seeds) };
}
