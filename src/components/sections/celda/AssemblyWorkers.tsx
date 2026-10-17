import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mat } from "./robotMetal";
import type { Theme } from "./assemblyTextures";

/*
 * Operarios de la línea: figuras procedurales propias (no se descargó nada).
 * Cada persona es UNA malla con esqueleto (SkinnedMesh) → un draw call.
 *
 * Cómo se arma: el cuerpo se "esculpe" con anillos (loft): una lista de
 * secciones superelípticas apiladas, cada una con ancho, frente y espalda
 * propios. Así salen pecho, panza, gemelos o la visera del casco sin modelar
 * vértice por vértice. Las piezas grandes que cruzan articulaciones (piernas,
 * brazos, torso, cuello) reparten el peso entre dos huesos cerca de la
 * articulación (smoothstep sobre la altura en reposo): rodilla y codo se
 * doblan sin quebrarse. Los accesorios chicos van pegados a un solo hueso.
 *
 * El color va por vértice, con una oclusión ambiental falsa (entrepierna,
 * axilas, bajo el ala del casco) horneada en el mismo color: da volumen sin
 * sombras ni texturas. Dos atributos más alimentan el material compartido:
 *  - `glow`: las franjas reflectantes suman emisión según el tema (en el
 *    oscuro "devuelven" la luz como una cinta reflectante de verdad); un valor
 *    ≥ 2 marca algo con luz propia (pantalla, LED): emite `glow − 2` siempre;
 *  - `rough`: rugosidad por pieza (casco brillante, tela mate, cuero).
 *
 * Animación procedural, función del tiempo: caminar con contrapeso de brazos
 * y cadera (fase según la distancia recorrida, para que los pies no patinen),
 * respirar, cambiar el peso de pierna, mirar alrededor con pausas, usar la
 * tableta.
 */

const BONES = [
  "hips", "spine", "chest", "neck", "head",
  "shoulderL", "armL", "foreL", "handL",
  "shoulderR", "armR", "foreR", "handR",
  "thighL", "shinL", "footL",
  "thighR", "shinR", "footR",
] as const;
type BoneName = (typeof BONES)[number];
type Bones = Record<BoneName, THREE.Bone>;
const PARENT: Record<BoneName, BoneName | null> = {
  hips: null, spine: "hips", chest: "spine", neck: "chest", head: "neck",
  shoulderL: "chest", armL: "shoulderL", foreL: "armL", handL: "foreL",
  shoulderR: "chest", armR: "shoulderR", foreR: "armR", handR: "foreR",
  thighL: "hips", shinL: "thighL", footL: "shinL",
  thighR: "hips", shinR: "thighR", footR: "shinR",
};
/**
 * Posición de cada articulación en reposo (de pie, mirando a +Z, brazos abajo).
 * L = izquierda del operario = +X. No cambiar a la ligera: el conductor del
 * autoelevador (AssemblyPalletizer) está ubicado contra la cadera a 0,95.
 */
const REST: Record<BoneName, [number, number, number]> = {
  hips: [0, 0.95, 0], spine: [0, 1.06, 0], chest: [0, 1.28, 0], neck: [0, 1.5, 0], head: [0, 1.58, 0],
  shoulderL: [0.17, 1.44, 0], armL: [0.2, 1.43, 0], foreL: [0.215, 1.15, 0], handL: [0.225, 0.9, 0.01],
  shoulderR: [-0.17, 1.44, 0], armR: [-0.2, 1.43, 0], foreR: [-0.215, 1.15, 0], handR: [-0.225, 0.9, 0.01],
  thighL: [0.095, 0.9, 0], shinL: [0.1, 0.49, 0], footL: [0.1, 0.08, 0],
  thighR: [-0.095, 0.9, 0], shinR: [-0.1, 0.49, 0], footR: [-0.1, 0.08, 0],
};

/** Aspecto de una persona: ropa, rasgos y complexión. */
export type WorkerLook = {
  vest: string;
  helmet: string;
  skin: string;
  hair: string;
  pants: string;
  shirt: string;
  gloves: string;
  boots: string;
  hairStyle: "short" | "buzz" | "ponytail";
  beard: "none" | "beard" | "stache";
  glasses: "clear" | "tinted";
  sleeves: "long" | "rolled";
  tablet: boolean;
  radio: "chest" | "belt" | "none";
  harness: boolean;
  kneepads: boolean;
  earmuffs: boolean;
  /** Complexión: ancho de hombros, cintura, cadera (multiplicadores) y panza/busto (metros). */
  build: { sh: number; waist: number; hip: number; belly: number; bust: number };
  /** Escala de altura (el conductor queda en 1 para entrar en el asiento). */
  height: number;
};

// ------------------------------------------------------------- geometría --

/**
 * Sección de un loft: superelipse a la altura `y`, centrada en (x, z), con
 * medio ancho `rx`, frente `f` (+Z) y espalda `b` (−Z). `p` = 2 es elipse; más
 * alto, más "cuadrada". `c` pinta ese anillo con otro color.
 */
type Ring = { y: number; rx: number; f: number; b?: number; x?: number; z?: number; p?: number; c?: string };

/** Punto del anillo en el ángulo `th` (0 = frente, π/2 = +X). */
function ringPoint(r: Ring, th: number, out: THREE.Vector3) {
  const s = Math.sin(th);
  const c = Math.cos(th);
  const e = 2 / (r.p ?? 2);
  const sx = Math.sign(s) * Math.abs(s) ** e;
  const sz = Math.sign(c) * Math.abs(c) ** e;
  return out.set((r.x ?? 0) + r.rx * sx, r.y, (r.z ?? 0) + (c >= 0 ? r.f : r.b ?? r.f) * sz);
}

/** Anillo interpolado a la altura `y` (para franjas y bolsillos que siguen una superficie). */
function ringAt(rings: Ring[], y: number, grow = 0): Ring {
  let i = 0;
  while (i < rings.length - 2 && rings[i + 1].y < y) i++;
  const a = rings[i];
  const b = rings[i + 1];
  const t = Math.min(Math.max((y - a.y) / (b.y - a.y), 0), 1);
  const l = (u: number, v: number) => u + (v - u) * t;
  return {
    y,
    rx: l(a.rx, b.rx) + grow,
    f: l(a.f, b.f) + grow,
    b: l(a.b ?? a.f, b.b ?? b.f) + grow,
    x: l(a.x ?? 0, b.x ?? 0),
    z: l(a.z ?? 0, b.z ?? 0),
    p: l(a.p ?? 2, b.p ?? 2),
  };
}

/**
 * Loft indexado de abajo hacia arriba (los anillos van con `y` creciente).
 * Con `th0`/`th1` arma solo una franja angular (parche, cinta, bolsillo).
 * `warp` deforma cada vértice (pliegues, escote del chaleco).
 */
function loft(
  rings: Ring[],
  seg: number,
  o: { th0?: number; th1?: number; base?: string; warp?: (v: THREE.Vector3, th: number) => void } = {},
) {
  const open = o.th0 !== undefined && o.th1 !== undefined;
  const cols = open ? seg + 1 : seg;
  const pos: number[] = [];
  const col: number[] = [];
  const painted = rings.some((r) => r.c);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  for (const r of rings) {
    if (painted) c.set(r.c ?? o.base ?? "#ffffff");
    for (let j = 0; j < cols; j++) {
      const th = open ? o.th0! + ((o.th1! - o.th0!) * j) / seg : (j / seg) * Math.PI * 2;
      ringPoint(r, th, v);
      o.warp?.(v, th);
      pos.push(v.x, v.y, v.z);
      if (painted) col.push(c.r, c.g, c.b);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const j1 = open ? j + 1 : (j + 1) % seg;
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const cc = (i + 1) * cols + j1;
      const d = i * cols + j1;
      idx.push(a, d, b, d, cc, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (painted) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // En un polo (anillo de radio 0) cada copia del vértice heredaría la normal
  // de un solo triángulo y se vería un punto oscuro: apuntan todas al eje.
  if (!open) {
    const n = g.getAttribute("normal");
    const ends: [number, number][] = [[0, -1], [rings.length - 1, 1]];
    for (const [i, dir] of ends) {
      const r = rings[i];
      if (r.rx > 0 || r.f > 0) continue;
      for (let j = 0; j < cols; j++) n.setXYZ(i * cols + j, 0, dir, 0);
    }
  }
  return g;
}

/**
 * Banda que abraza una superficie entre dos alturas. Si sobresale bastante
 * (puño arremangado, cinturón) se cierra por arriba y por abajo para que no se
 * vea el interior hueco.
 */
function band(rings: Ring[], y0: number, y1: number, grow: number, seg: number) {
  const outer = [ringAt(rings, y0, grow), ringAt(rings, y1, grow)];
  if (grow < 0.006) return loft(outer, seg);
  return loft([{ ...ringAt(rings, y0 + 0.001), y: y0 }, ...outer, { ...ringAt(rings, y1 - 0.001), y: y1 + 0.0001 }], seg);
}

/** Parche sobre una superficie: franja angular entre alturas, levemente despegada. */
function patch(rings: Ring[], ys: number[], th0: number, th1: number, grow: number | number[], seg = 2, warp?: (v: THREE.Vector3, th: number) => void) {
  return loft(ys.map((y, i) => ringAt(rings, y, Array.isArray(grow) ? grow[i] : grow)), seg, { th0, th1, warp });
}

/** Pose sobre una superficie: posición y giro para pegar una caja (bolsillo, radio). */
function onSurface(rings: Ring[], y: number, th: number, lift: number) {
  const r = ringAt(rings, y);
  const p = ringPoint(r, th, new THREE.Vector3());
  const q = ringPoint(r, th + 0.02, new THREE.Vector3());
  // Normal horizontal: perpendicular a la tangente del anillo, hacia afuera.
  const n = new THREE.Vector3(q.z - p.z, 0, p.x - q.x).normalize();
  p.addScaledVector(n, lift);
  return { p, yaw: Math.atan2(n.x, n.z) };
}

function ellipsoid(rx: number, ry: number, rz: number, w = 10, h = 7) {
  return new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
}

/** Dedo: cápsula colgando desde y = 0, curvada hacia la palma (−X·sx). */
function finger(r: number, len: number, curl: number, sx: number) {
  const g = new THREE.CapsuleGeometry(r, len, 2, 5).translate(0, -(len / 2 + r), 0);
  const p = g.getAttribute("position");
  const L = len + 2 * r;
  for (let i = 0; i < p.count; i++) {
    const t = -p.getY(i) / L;
    p.setX(i, p.getX(i) - sx * curl * t * t * L);
  }
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------- pesos --

type Weights = [BoneName, number][];
type SkinFn = (p: THREE.Vector3) => Weights;

const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Pesos de una cadena de huesos según la altura en reposo: `bones[k+1]` empieza
 * en `joints[k]`; cerca de cada articulación (±h) el peso pasa de uno a otro.
 * `down` = la cadena cuelga (piernas, brazos); si no, sube (torso, cuello).
 */
function chain(bones: BoneName[], joints: number[], h: number[], down: boolean): SkinFn {
  return (p) => {
    const w: Weights = [];
    let carry = 1;
    for (let k = 0; k < bones.length; k++) {
      const t = k < joints.length ? (down ? sstep(joints[k] + h[k], joints[k] - h[k], p.y) : sstep(joints[k] - h[k], joints[k] + h[k], p.y)) : 1;
      const own = k < joints.length ? carry * (1 - t) : carry;
      if (own > 1e-3) w.push([bones[k], own]);
      carry *= t;
    }
    return w;
  };
}
const TORSO = chain(["hips", "spine", "chest", "neck", "head"], [1.04, 1.24, 1.47, 1.565], [0.05, 0.07, 0.035, 0.03], false);
const legSkin = (s: "L" | "R") => chain(["hips", `thigh${s}`, `shin${s}`, `foot${s}`], [0.89, 0.49, 0.1], [0.05, 0.06, 0.03], true);
const armSkin = (s: "L" | "R") => chain([`shoulder${s}`, `arm${s}`, `fore${s}`, `hand${s}`], [1.415, 1.15, 0.905], [0.035, 0.05, 0.02], true);

/**
 * Oclusión ambiental falsa en reposo: oscurece donde en la vida real casi no
 * llega luz. Barata (se calcula una vez al armar la malla) y suma mucho volumen.
 */
function fakeAO(p: THREE.Vector3) {
  const ax = Math.abs(p.x);
  let k = 1;
  // entrepierna y cara interna de los muslos
  if (p.y < 0.98 && p.y > 0.55) k *= 0.72 + 0.28 * sstep(0.02, 0.085, ax);
  // axilas: costado del torso y cara interna del brazo
  if (p.y > 1.18 && p.y < 1.44) k *= 1 - 0.3 * (1 - sstep(0, 0.035, Math.abs(ax - 0.162))) * (1 - sstep(0.03, 0.08, Math.abs(p.z)));
  // cuello bajo el mentón
  if (p.y > 1.47 && p.y < 1.585 && ax < 0.07) k *= 0.78 + 0.22 * sstep(1.55, 1.6, p.y);
  // frente y sienes bajo el ala del casco
  if (p.y > 1.66 && p.y < 1.75) k *= 1 - 0.28 * sstep(1.67, 1.72, p.y);
  // tobillos/botas contra el piso
  if (p.y < 0.06) k *= 0.8 + 0.2 * sstep(0, 0.06, p.y);
  return k;
}

// ------------------------------------------------------------- armado --

type PartOpts = { at?: THREE.Matrix4; color: string; skin: BoneName | SkinFn; glow?: number; rough?: number; ao?: boolean };

/** Agrega una pieza: la ubica en reposo, la pinta y le pone pesos. */
function addPart(list: THREE.BufferGeometry[], g: THREE.BufferGeometry, o: PartOpts) {
  if (o.at) g.applyMatrix4(o.at);
  for (const n of Object.keys(g.attributes)) if (n !== "position" && n !== "normal" && n !== "color") g.deleteAttribute(n);
  if (!g.index) throw new Error("AssemblyWorkers: todas las piezas deben ser indexadas");
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const pos = g.getAttribute("position");
  const count = pos.count;
  const painted = g.getAttribute("color");
  const base = new THREE.Color(o.color);
  const col = new Float32Array(count * 3);
  const idx = new Uint16Array(count * 4);
  const w = new Float32Array(count * 4);
  const p = new THREE.Vector3();
  const fixed = typeof o.skin === "string" ? BONES.indexOf(o.skin) : -1;
  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i);
    const k = o.ao === false ? 1 : fakeAO(p);
    if (painted) {
      col[i * 3] = painted.getX(i) * k;
      col[i * 3 + 1] = painted.getY(i) * k;
      col[i * 3 + 2] = painted.getZ(i) * k;
    } else {
      col[i * 3] = base.r * k;
      col[i * 3 + 1] = base.g * k;
      col[i * 3 + 2] = base.b * k;
    }
    if (fixed >= 0) {
      idx[i * 4] = fixed;
      w[i * 4] = 1;
    } else {
      const ws = (o.skin as SkinFn)(p).sort((a, b) => b[1] - a[1]).slice(0, 2);
      const sum = ws.reduce((s, x) => s + x[1], 0);
      ws.forEach(([bone, v], j) => {
        idx[i * 4 + j] = BONES.indexOf(bone);
        w[i * 4 + j] = v / sum;
      });
    }
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute("skinWeight", new THREE.BufferAttribute(w, 4));
  g.setAttribute("glow", new THREE.BufferAttribute(new Float32Array(count).fill(o.glow ?? 0), 1));
  g.setAttribute("rough", new THREE.BufferAttribute(new Float32Array(count).fill(o.rough ?? 0.85), 1));
  list.push(g);
}

/** Tono más oscuro/claro de un color (costuras, ribetes, labios). */
function tone(hex: string, k: number) {
  return "#" + new THREE.Color(hex).multiplyScalar(k).getHexString();
}

const REFLECT = "#e4e7e8";
const WEBBING = "#1f2124";

function buildWorker(look: WorkerLook) {
  const L: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, o: PartOpts) => addPart(L, g, o);
  const R = REST;
  const at = (b: BoneName, dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0) => mat(R[b][0] + dx, R[b][1] + dy, R[b][2] + dz, rx, ry, rz);
  const { sh, waist, hip, belly, bust } = look.build;

  // ---------------- piernas y botas
  for (const s of ["L", "R"] as const) {
    const sx = s === "L" ? 1 : -1;
    const skin = legSkin(s);
    const foot = `foot${s}` as BoneName;
    const cx = (y: number) => sx * (0.095 + (0.9 - y) * 0.006);
    // Pantalón de trabajo holgado: rodilla marcada, gemelo atrás, bota "embolsada".
    const leg: Ring[] = [
      [0.13, 0.06, 0.062, 0.064],
      [0.15, 0.064, 0.066, 0.066],
      [0.2, 0.06, 0.06, 0.063],
      [0.26, 0.059, 0.058, 0.064],
      [0.36, 0.063, 0.061, 0.072],
      [0.44, 0.063, 0.064, 0.067],
      [0.5, 0.066, 0.073, 0.064],
      [0.56, 0.068, 0.07, 0.068],
      [0.68, 0.076 * hip, 0.074, 0.078],
      [0.8, 0.083 * hip, 0.081, 0.087],
      [0.9, 0.088 * hip, 0.088, 0.096],
      [0.98, 0.084 * hip, 0.084, 0.094],
    ].map(([y, rx, f, b]) => ({ y, rx, f, b, x: cx(y), p: 2.2 }));
    // Pliegues de tela en la corva y sobre la bota (ondas suaves, no simétricas).
    const folds = (v: THREE.Vector3, th: number) => {
      const amp = 0.05 * (sstep(0.4, 0.46, v.y) - sstep(0.54, 0.6, v.y)) + 0.07 * (sstep(0.13, 0.16, v.y) - sstep(0.2, 0.23, v.y));
      if (amp <= 0) return;
      const k = 1 + amp * Math.sin(th * 3 + v.y * 70 + sx);
      const c = cx(v.y);
      v.x = c + (v.x - c) * k;
      v.z *= k;
    };
    add(loft(leg, 12, { warp: folds }), { color: look.pants, skin });
    // Ruedo del pantalón (cierra hacia adentro sobre la bota).
    add(loft([{ y: 0.12, rx: 0.047, f: 0.047, x: cx(0.12) }, { y: 0.13, rx: 0.06, f: 0.062, b: 0.064, x: cx(0.13) }], 12), { color: tone(look.pants, 0.8), skin });
    // Franja reflectante en la canilla.
    add(band(leg, 0.235, 0.265, 0.004, 12), { color: REFLECT, skin, glow: 1, rough: 0.45 });
    // Bolsillo cargo al costado del muslo, con tapa.
    const outer = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    add(patch(leg, [0.63, 0.66, 0.7, 0.74, 0.76], outer - 0.55, outer + 0.55, [0.004, 0.012, 0.014, 0.012, 0.006], 3), { color: tone(look.pants, 0.92), skin });
    add(patch(leg, [0.755, 0.785], outer - 0.6, outer + 0.6, 0.016, 3), { color: tone(look.pants, 0.8), skin });
    if (look.kneepads) {
      // Rodillera: domo sobre la rodilla + correa.
      add(patch(leg, [0.43, 0.46, 0.5, 0.54, 0.57], -0.95, 0.95, [0.006, 0.02, 0.026, 0.02, 0.006], 6), { color: "#2b2d30", skin, rough: 0.6 });
      add(band(leg, 0.445, 0.46, 0.005, 12), { color: WEBBING, skin });
    }
    if (look.harness) add(band(leg, 0.8, 0.825, 0.007, 12), { color: WEBBING, skin, rough: 0.7 }); // pernera del arnés

    // Bota de seguridad: caña acolchada + capellada (loft horizontal) + suela.
    const shaft: Ring[] = [
      { y: -0.045, rx: 0.05, f: 0.052, b: 0.056 },
      { y: 0.03, rx: 0.052, f: 0.054, b: 0.056 },
      { y: 0.07, rx: 0.058, f: 0.06, b: 0.062 },
      { y: 0.085, rx: 0.055, f: 0.057, b: 0.06 },
      { y: 0.088, rx: 0.044, f: 0.046, b: 0.048 },
    ];
    add(loft(shaft, 10), { at: at(foot), color: look.boots, skin: foot, rough: 0.6 });
    // Capellada: loft a lo largo del pie (y del loft = +Z del pie; z del loft = −Y).
    const upper = [
      [-0.075, 0.0, -0.035, 0.02, 0.02],
      [-0.07, 0.036, -0.035, 0.035, 0.04],
      [-0.05, 0.047, -0.03, 0.05, 0.062],
      [0.0, 0.05, -0.025, 0.055, 0.06],
      [0.05, 0.053, -0.035, 0.045, 0.045],
      [0.1, 0.055, -0.045, 0.035, 0.035],
      [0.15, 0.053, -0.05, 0.03, 0.03],
      [0.18, 0.046, -0.052, 0.028, 0.026],
      [0.2, 0.03, -0.056, 0.022, 0.016],
      [0.206, 0.0, -0.058, 0.01, 0.006],
    ].map(([y, rx, cy, down, up], i) => ({ y, rx, x: 0, z: -cy, f: down, b: up, p: 2.6, c: i >= 6 ? tone(look.boots, 0.75) : undefined }));
    add(loft(upper, 10, { base: look.boots }).rotateX(Math.PI / 2), { at: at(foot), color: look.boots, skin: foot, rough: 0.55 });
    const sole = [
      [-0.082, 0.0],
      [-0.078, 0.042],
      [-0.06, 0.054],
      [0.12, 0.06],
      [0.18, 0.054],
      [0.205, 0.038],
      [0.214, 0.0],
    ].map(([y, rx]) => ({ y, rx, z: 0.068, f: 0.013, b: 0.013, p: 4 }));
    add(loft(sole, 10).rotateX(Math.PI / 2), { at: at(foot), color: "#141414", skin: foot, rough: 0.9 });
    // Cordones: tres pasadas sobre el empeine.
    for (let k = 0; k < 3; k++) {
      add(new THREE.BoxGeometry(0.05, 0.006, 0.008), { at: at(foot, 0, 0.022 - k * 0.011, 0.02 + k * 0.024, -0.5), color: "#b59a6a", skin: foot });
    }
  }

  // ---------------- cadera, cinturón
  const pelvis: Ring[] = [
    { y: 0.86, rx: 0.06, f: 0.05, b: 0.06 },
    { y: 0.89, rx: 0.13 * hip, f: 0.082, b: 0.095 },
    { y: 0.94, rx: 0.16 * hip, f: 0.092, b: 0.11 },
    { y: 0.99, rx: 0.158 * hip, f: 0.094 + belly * 0.4, b: 0.104 },
    { y: 1.04, rx: 0.152 * waist, f: 0.094 + belly * 0.6, b: 0.098 },
  ].map((r) => ({ ...r, p: 2.3 }));
  add(loft(pelvis, 20), { color: look.pants, skin: TORSO });
  add(band(pelvis, 0.995, 1.035, 0.006, 20), { color: "#1b1c1e", skin: TORSO, rough: 0.6 });
  // Hebilla y presillas.
  const buckle = onSurface(pelvis, 1.015, 0, 0.01);
  add(new THREE.BoxGeometry(0.05, 0.034, 0.008), { at: mat(buckle.p.x, buckle.p.y, buckle.p.z, 0, buckle.yaw, 0), color: "#8e9294", skin: "hips", rough: 0.35 });
  for (const th of [-2.2, -1.1, 1.1, 2.2]) {
    const lp = onSurface(pelvis, 1.012, th, 0.011);
    add(new THREE.BoxGeometry(0.012, 0.05, 0.006), { at: mat(lp.p.x, lp.p.y, lp.p.z, 0, lp.yaw, 0), color: tone(look.pants, 0.7), skin: "hips" });
  }
  // Cinta métrica en la cadera derecha.
  const tape = onSurface(pelvis, 0.97, -1.75, 0.03);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12).rotateZ(Math.PI / 2), { at: mat(tape.p.x, tape.p.y, tape.p.z, 0, tape.yaw - Math.PI / 2, 0), color: "#e2b21c", skin: "hips", rough: 0.4 });
  if (look.radio === "belt") {
    const rp = onSurface(pelvis, 0.985, 1.95, 0.022);
    add(new THREE.BoxGeometry(0.055, 0.1, 0.03), { at: mat(rp.p.x, rp.p.y, rp.p.z, 0, rp.yaw, 0), color: "#1a1b1d", skin: "hips", rough: 0.5 });
    add(new THREE.CylinderGeometry(0.006, 0.008, 0.08, 6), { at: mat(rp.p.x, rp.p.y + 0.09, rp.p.z, 0, 0, 0), color: "#1a1b1d", skin: "hips" });
  }

  // ---------------- torso: camisa, chaleco y sus detalles
  const shirtRings: Ring[] = [
    [0.98, 0.15 * hip, 0.094, 0.1],
    [1.06, 0.146 * waist, 0.094 + belly * 0.7, 0.094],
    [1.14, 0.15 * waist, 0.098 + belly, 0.092],
    [1.22, 0.16, 0.102 + belly * 0.5 + bust * 0.3, 0.094],
    [1.3, 0.17 * sh, 0.106 + bust, 0.098],
    [1.37, 0.176 * sh, 0.104 + bust * 0.6, 0.1],
    [1.42, 0.176 * sh, 0.088, 0.09],
    [1.455, 0.148 * sh, 0.07, 0.076],
    [1.48, 0.1, 0.058, 0.066],
    [1.5, 0.062, 0.05, 0.058],
  ].map(([y, rx, f, b]) => ({ y, rx, f, b, z: -0.005, p: 2.4 }));
  add(loft(shirtRings, 18), { color: look.shirt, skin: TORSO }); // casi toda tapada por el chaleco
  // Cuello de la camisa (tipo polo, levemente abierto adelante).
  add(loft([{ y: 1.48, rx: 0.066, f: 0.058, b: 0.064, z: -0.004 }, { y: 1.522, rx: 0.068, f: 0.06, b: 0.066, z: -0.008 }, { y: 1.527, rx: 0.058, f: 0.052, b: 0.058, z: -0.006 }], 16), { color: tone(look.shirt, 1.1), skin: TORSO });

  // Chaleco: un poco más grande que la camisa, con escote en V (el frente alto
  // se hunde detrás de la camisa) y ribete en el borde inferior.
  const vestRings: Ring[] = [1.03, 1.06, 1.14, 1.22, 1.27, 1.3, 1.34, 1.37, 1.4, 1.42, 1.44, 1.458].map((y) => ringAt(shirtRings, y, 0.012));
  vestRings[0] = { ...vestRings[0], rx: vestRings[0].rx + 0.006, f: vestRings[0].f + 0.006, b: vestRings[0].b! + 0.006 };
  const vNeck = (v: THREE.Vector3, th: number) => {
    const open = sstep(1.27, 1.46, v.y) * 0.085; // medio ancho del escote a esa altura
    if (Math.cos(th) > 0 && Math.abs(v.x) < open) v.z -= 0.028 * (1 - Math.abs(v.x) / open);
  };
  add(loft(vestRings, 24, { warp: vNeck }), { color: look.vest, skin: TORSO, rough: 0.8 });
  add(band(vestRings, 1.03, 1.045, 0.002, 24), { color: tone(look.vest, 0.7), skin: TORSO });
  // Franjas reflectantes: dos horizontales y dos tiradores que suben al hombro (adelante y atrás).
  for (const y of [1.1, 1.2]) add(band(vestRings, y, y + 0.032, 0.003, 24), { color: REFLECT, skin: TORSO, glow: 1, rough: 0.45 });
  const strapYs = [1.232, 1.27, 1.3, 1.34, 1.37, 1.4, 1.42, 1.44, 1.455];
  for (const th of [0.62, -0.62, Math.PI - 0.55, -(Math.PI - 0.55)]) {
    add(patch(vestRings, strapYs, th - 0.13, th + 0.13, 0.003, 1), { color: REFLECT, skin: TORSO, glow: 1, rough: 0.45 });
  }
  // Costuras laterales y cierre delantero.
  for (const th of [Math.PI / 2, -Math.PI / 2]) add(patch(vestRings, [1.045, 1.2, 1.38], th - 0.025, th + 0.025, 0.002, 1), { color: tone(look.vest, 0.62), skin: TORSO });
  add(patch(vestRings, [1.045, 1.1, 1.2, 1.27], -0.022, 0.022, 0.003, 1), { color: tone(look.vest, 0.45), skin: TORSO });
  const pull = onSurface(vestRings, 1.255, 0.04, 0.006);
  add(new THREE.BoxGeometry(0.01, 0.022, 0.004), { at: mat(pull.p.x, pull.p.y, pull.p.z, 0, pull.yaw, 0), color: "#9a9ea0", skin: "chest", rough: 0.35 });
  // Bolsillos bajos con tapa (abajo de la franja inferior).
  for (const th of [0.55, -0.55]) {
    add(patch(vestRings, [1.05, 1.06, 1.08, 1.095], th - 0.32, th + 0.32, [0.003, 0.007, 0.007, 0.004], 3), { color: tone(look.vest, 0.9), skin: TORSO });
  }
  // Bolsillo de pecho con birome (derecha) y credencial (izquierda).
  add(patch(vestRings, [1.3, 1.32, 1.345, 1.355], -0.62 - 0.07, -0.33, [0.003, 0.007, 0.006, 0.004], 2), { color: tone(look.vest, 0.88), skin: TORSO });
  const pen = onSurface(vestRings, 1.36, -0.47, 0.01);
  add(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 6), { at: mat(pen.p.x, pen.p.y, pen.p.z), color: "#1d4fa8", skin: "chest" });
  const badge = onSurface(vestRings, 1.3, 0.36, 0.006);
  add(new THREE.BoxGeometry(0.045, 0.06, 0.004), { at: mat(badge.p.x, badge.p.y, badge.p.z, 0.05, badge.yaw, 0), color: "#f1f2ee", skin: "chest", rough: 0.4 });
  add(new THREE.BoxGeometry(0.03, 0.012, 0.005), { at: mat(badge.p.x, badge.p.y + 0.016, badge.p.z + 0.001, 0.05, badge.yaw, 0), color: "#2f6fb5", skin: "chest" });
  if (look.radio === "chest") {
    const rp = onSurface(vestRings, 1.33, 0.75, 0.02);
    add(new THREE.BoxGeometry(0.05, 0.085, 0.026), { at: mat(rp.p.x, rp.p.y, rp.p.z, 0, rp.yaw, 0), color: "#1a1b1d", skin: "chest", rough: 0.5 });
    add(new THREE.CylinderGeometry(0.005, 0.007, 0.07, 6), { at: mat(rp.p.x + 0.012, rp.p.y + 0.075, rp.p.z, 0, 0, 0), color: "#1a1b1d", skin: "chest" });
    add(new THREE.BoxGeometry(0.03, 0.012, 0.004), { at: mat(rp.p.x, rp.p.y + 0.02, rp.p.z + 0.012, 0, rp.yaw, 0), color: "#6fd35a", skin: "chest", glow: 2 + 0.7, ao: false });
  }
  if (look.harness) {
    // Arnés: tiradores adelante y atrás, pechera, cinturón y perneras.
    const hy = [1.05, 1.15, 1.25, 1.33, 1.4, 1.44, 1.462];
    for (const th of [0.32, -0.32, Math.PI - 0.32, -(Math.PI - 0.32)]) add(patch(vestRings, hy, th - 0.09, th + 0.09, 0.008, 1), { color: WEBBING, skin: TORSO, rough: 0.7 });
    add(patch(vestRings, [1.255, 1.282], -0.45, 0.45, 0.01, 4), { color: WEBBING, skin: TORSO, rough: 0.7 });
    const clip = onSurface(vestRings, 1.268, 0, 0.016);
    add(new THREE.BoxGeometry(0.04, 0.03, 0.01), { at: mat(clip.p.x, clip.p.y, clip.p.z, 0, clip.yaw, 0), color: "#b9bcbd", skin: "chest", rough: 0.3 });
    add(band(pelvis, 1.0, 1.03, 0.014, 20), { color: WEBBING, skin: TORSO, rough: 0.7 });
    const ring = onSurface(vestRings, 1.38, Math.PI, 0.02);
    add(new THREE.TorusGeometry(0.022, 0.005, 5, 10), { at: mat(ring.p.x, ring.p.y, ring.p.z), color: "#b9bcbd", skin: "chest", rough: 0.3 });
  }

  // ---------------- brazos y guantes
  for (const s of ["L", "R"] as const) {
    const sx = s === "L" ? 1 : -1;
    const hand = `hand${s}` as BoneName;
    const skin = armSkin(s);
    const cx = (y: number) => sx * (0.2 + (1.43 - y) * 0.047);
    const sleeve = look.sleeves === "long" ? 0.93 : 1.13; // hasta dónde llega la manga
    // Brazo: deltoides, bíceps, codo, antebrazo y muñeca. La manga larga es
    // más holgada; arremangado, el antebrazo queda con piel.
    const arm: Ring[] = [
      [0.9, 0.028, 0.03, 0.03],
      [0.925, 0.032, 0.035, 0.034],
      [0.97, 0.036, 0.04, 0.038],
      [1.04, 0.042, 0.045, 0.042],
      [1.1, 0.045, 0.047, 0.044],
      [1.16, 0.043, 0.043, 0.047],
      [1.24, 0.046, 0.047, 0.046],
      [1.31, 0.049, 0.052, 0.049],
      [1.37, 0.053, 0.055, 0.054],
      [1.41, 0.054, 0.054, 0.056],
      [1.435, 0.045, 0.047, 0.049],
      [1.448, 0.03, 0.031, 0.033],
      [1.455, 0.012, 0.012, 0.013],
      [1.457, 0.0, 0.0, 0.0],
    ].map(([y, rx, f, b]) => {
      const cloth = y >= sleeve;
      const loose = cloth ? (look.sleeves === "long" ? 0.008 : 0.005) : 0;
      const k = 0.85 + 0.15 * sh * sh; // brazos más finos en complexiones chicas
      return { y, rx: rx * k + loose, f: f * k + loose, b: b * k + loose, x: cx(y), z: (1.43 - y) * 0.02, c: cloth ? look.shirt : look.skin };
    });
    // Corte nítido entre piel y manga: dos anillos casi pegados.
    const cut = arm.findIndex((r) => r.y >= sleeve);
    if (cut > 0) arm.splice(cut, 0, { ...ringAt(arm, sleeve - 0.002), c: arm[cut - 1].c }, { ...ringAt(arm, sleeve + 0.001, 0.006), c: look.shirt });
    // Pliegues en el pliegue del codo (solo en la tela).
    const elbow = (v: THREE.Vector3, th: number) => {
      if (v.y < sleeve) return;
      const amp = 0.06 * (sstep(1.11, 1.15, v.y) - sstep(1.2, 1.25, v.y));
      if (amp <= 0) return;
      const k = 1 + amp * Math.sin(th * 2 + v.y * 90);
      const c = cx(v.y);
      v.x = c + (v.x - c) * k;
    };
    add(loft(arm, 12, { base: look.shirt, warp: elbow }), { color: look.shirt, skin });
    // Puño de la manga o manga arremangada (rollo de tela).
    const cuff = look.sleeves === "long" ? [0.93, 0.955] : [1.13, 1.165];
    add(band(arm, cuff[0], cuff[1], look.sleeves === "long" ? 0.004 : 0.01, 12), { color: tone(look.shirt, 0.92), skin });
    // Franja reflectante en el antebrazo (solo con manga larga).
    if (look.sleeves === "long") add(band(arm, 1.0, 1.022, 0.004, 12), { color: REFLECT, skin, glow: 0.6, rough: 0.45 });

    // Guante: palma (plana, de canto contra el muslo), puño, 4 dedos y pulgar.
    const palm: Ring[] = [
      { y: -0.094, rx: 0.011, f: 0.028, b: 0.03, p: 3 },
      { y: -0.085, rx: 0.017, f: 0.041, b: 0.042, p: 3 },
      { y: -0.05, rx: 0.019, f: 0.044, b: 0.04, p: 3 },
      { y: -0.02, rx: 0.02, f: 0.038, b: 0.035, p: 3 },
      { y: 0.0, rx: 0.025, f: 0.032, b: 0.031 },
      { y: 0.008, rx: 0.036, f: 0.041, b: 0.04, c: tone(look.gloves, 0.8) },
      { y: 0.05, rx: 0.039, f: 0.044, b: 0.043, c: tone(look.gloves, 0.8) },
      { y: 0.056, rx: 0.031, f: 0.035, b: 0.035, c: tone(look.gloves, 0.8) },
    ];
    add(loft(palm, 10, { base: look.gloves }), { at: at(hand), color: look.gloves, skin: hand, rough: 0.7 });
    // La mano de la tableta cierra más los dedos (agarra el borde).
    const grip = look.tablet && s === "L" ? 0.55 : 0.28;
    const lens = [0.062, 0.07, 0.066, 0.054];
    [0.028, 0.0095, -0.0095, -0.027].forEach((z, i) => {
      add(finger(0.0092, lens[i], grip, sx), { at: at(hand, 0, -0.082, z, 0, 0, 0), color: look.gloves, skin: hand, rough: 0.7 });
    });
    // Pulgar: sale del costado delantero de la palma y se apoya hacia el lado de la palma.
    add(finger(0.0105, 0.036, 0.15, sx), { at: at(hand, -sx * 0.012, -0.028, 0.036, -0.22, 0, -sx * 0.5), color: look.gloves, skin: hand, rough: 0.7 });
  }

  // ---------------- cuello y cabeza
  add(loft([
    { y: 1.46, rx: 0.056, f: 0.05, b: 0.058, z: -0.008 },
    { y: 1.52, rx: 0.052, f: 0.048, b: 0.056, z: -0.01 },
    { y: 1.58, rx: 0.05, f: 0.046, b: 0.056, z: -0.012 },
    { y: 1.62, rx: 0.052, f: 0.04, b: 0.06, z: -0.015 },
  ], 12), { color: look.skin, skin: TORSO });

  const head: Ring[] = [
    [-0.026, 0.026, 0.014, 0.012, 0.058],
    [-0.018, 0.052, 0.036, 0.042, 0.044],
    [0.0, 0.066, 0.058, 0.062, 0.03],
    [0.03, 0.072, 0.077, 0.076, 0.02],
    [0.07, 0.074, 0.084, 0.09, 0.012],
    [0.11, 0.078, 0.088, 0.1, 0.006],
    [0.15, 0.079, 0.088, 0.105, 0.0],
    [0.19, 0.072, 0.077, 0.095, -0.004],
    [0.22, 0.055, 0.056, 0.072, -0.006],
    [0.24, 0.03, 0.03, 0.042, -0.008],
    [0.248, 0.0, 0.0, 0.0, -0.008],
  ].map(([y, rx, f, b, z]) => ({ y, rx, f, b, z, p: 2.15 }));
  // Ojos un poco hundidos y pómulos apenas salidos.
  const face = (v: THREE.Vector3) => {
    if (v.z < 0.04) return;
    const eye = Math.exp(-(((Math.abs(v.x) - 0.033) / 0.02) ** 2) - ((v.y - 0.112) / 0.018) ** 2);
    const cheek = Math.exp(-(((Math.abs(v.x) - 0.045) / 0.025) ** 2) - ((v.y - 0.075) / 0.022) ** 2);
    v.z += -0.008 * eye + 0.004 * cheek;
  };
  const H = (dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0) => at("head", dx, dy, dz, rx, ry, rz);
  add(loft(head, 20, { warp: face }), { at: H(), color: look.skin, skin: "head", rough: 0.6 });
  const skinDark = tone(look.skin, 0.85);
  // Nariz (puente → punta → aletas), orejas, labios.
  add(loft([
    { y: 0.062, rx: 0.0, f: 0.0, z: 0.094 },
    { y: 0.066, rx: 0.016, f: 0.008, b: 0.004, z: 0.097 },
    { y: 0.075, rx: 0.013, f: 0.013, b: 0.006, z: 0.1 },
    { y: 0.095, rx: 0.009, f: 0.009, b: 0.006, z: 0.097 },
    { y: 0.12, rx: 0.007, f: 0.004, b: 0.004, z: 0.093 },
  ], 8), { at: H(), color: look.skin, skin: "head", rough: 0.6 });
  for (const sx of [1, -1]) {
    add(ellipsoid(0.012, 0.028, 0.02, 8, 6), { at: H(sx * 0.08, 0.1, -0.008, 0, sx * 0.25, 0), color: skinDark, skin: "head", rough: 0.6 });
    // ojo: blanco + iris
    add(ellipsoid(0.011, 0.007, 0.006, 8, 5), { at: H(sx * 0.033, 0.112, 0.087, 0, sx * 0.3, 0), color: "#e9e4dc", skin: "head", rough: 0.3 });
    add(ellipsoid(0.0055, 0.0055, 0.003, 8, 4), { at: H(sx * 0.032, 0.112, 0.092, 0, sx * 0.3, 0), color: "#2a1d14", skin: "head", rough: 0.2 });
    // ceja
    add(new THREE.BoxGeometry(0.03, 0.007, 0.01), { at: H(sx * 0.034, 0.131, 0.093, 0, sx * 0.3, sx * -0.12), color: look.hair, skin: "head" });
  }
  add(ellipsoid(0.021, 0.0065, 0.008, 8, 4), { at: H(0, 0.038, 0.094), color: tone(look.skin, 0.75), skin: "head", rough: 0.5 });

  // Pelo según el estilo: casquete atrás y a los costados (lo de arriba lo tapa el casco).
  const hairCap = (grow: number) =>
    new THREE.SphereGeometry(1, 12, 7, Math.PI * 0.9, Math.PI * 1.2, 0.2, 1.75).scale(0.082 + grow, 0.12, 0.104 + grow);
  add(hairCap(look.hairStyle === "buzz" ? 0.001 : 0.006), { at: H(0, 0.115, -0.006), color: look.hair, skin: "head", rough: 0.9 });
  for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.008, 0.035, 0.016), { at: H(sx * 0.075, 0.12, 0.022), color: look.hair, skin: "head" });
  if (look.hairStyle === "ponytail") {
    add(loft([
      { y: -0.1, rx: 0.0, f: 0.0 },
      { y: -0.085, rx: 0.014, f: 0.012 },
      { y: -0.02, rx: 0.022, f: 0.018 },
      { y: 0.04, rx: 0.02, f: 0.018 },
      { y: 0.06, rx: 0.015, f: 0.014 },
    ], 8), { at: H(0, 0.1, -0.118, -0.25), color: look.hair, skin: "head", rough: 0.9 });
    add(new THREE.TorusGeometry(0.016, 0.005, 4, 8).rotateX(Math.PI / 2), { at: H(0, 0.145, -0.11, -0.25), color: "#b8322a", skin: "head" });
  }
  if (look.beard === "beard") {
    // Barba corta: un parche que copia la cara; lo que queda fuera del contorno
    // (mejillas altas y boca) se hunde detrás de la piel. El borde sube en
    // diagonal desde la comisura hasta la patilla.
    const shave = (v: THREE.Vector3, th: number) => {
      const a = Math.abs(th);
      const top = 0.026 + Math.max(0, a - 0.3) * 0.075;
      const mouth = a < 0.42 && v.y > 0.02 && v.y < 0.05 ? 1 : 0;
      const k = 1 - 0.15 * Math.max(sstep(top - 0.006, top + 0.008, v.y), mouth);
      v.x *= k;
      v.z = 0.012 + (v.z - 0.012) * k;
    };
    add(patch(head, [-0.026, -0.018, -0.004, 0.012, 0.026, 0.045, 0.065, 0.085, 0.105], -1.5, 1.5, [0.002, 0.005, 0.006, 0.006, 0.006, 0.006, 0.005, 0.004, 0.003], 14, shave), { at: H(), color: look.hair, skin: "head", rough: 0.95 });
  }
  if (look.beard !== "none") add(ellipsoid(0.026, 0.007, 0.01, 8, 4), { at: H(0, 0.052, 0.097), color: look.hair, skin: "head", rough: 0.95 });

  // Anteojos de seguridad: marco envolvente, patillas y (si son oscuros) lentes.
  for (const sx of [1, -1]) {
    add(new THREE.TorusGeometry(0.019, 0.0026, 4, 14).scale(1.05, 0.78, 1), { at: H(sx * 0.033, 0.114, 0.102, 0, sx * 0.28, 0), color: "#202325", skin: "head", rough: 0.3 });
    add(new THREE.BoxGeometry(0.004, 0.005, 0.085), { at: H(sx * 0.072, 0.118, 0.045, 0, sx * 0.08, 0), color: "#202325", skin: "head" });
    if (look.glasses === "tinted") add(new THREE.CircleGeometry(0.019, 12).scale(1.05, 0.78, 1), { at: H(sx * 0.033, 0.114, 0.103, 0, sx * 0.28, 0), color: "#2b3a44", skin: "head", rough: 0.1, ao: false });
  }
  add(new THREE.BoxGeometry(0.016, 0.005, 0.006), { at: H(0, 0.12, 0.105), color: "#202325", skin: "head" });

  // Casco: ala con visera al frente, cúpula con nervio central, banda interna y barboquejo.
  const helmetRings: Ring[] = [
    { y: 0.118, rx: 0.088, f: 0.098, b: 0.104, c: "#1e1f21" },
    { y: 0.128, rx: 0.106, f: 0.116, b: 0.118 },
    { y: 0.13, rx: 0.114, f: 0.168, b: 0.13 },
    { y: 0.137, rx: 0.116, f: 0.172, b: 0.132 },
    { y: 0.142, rx: 0.108, f: 0.128, b: 0.122 },
    { y: 0.15, rx: 0.106, f: 0.118, b: 0.12 },
    { y: 0.19, rx: 0.103, f: 0.113, b: 0.117 },
    { y: 0.225, rx: 0.087, f: 0.095, b: 0.099 },
    { y: 0.252, rx: 0.058, f: 0.063, b: 0.067 },
    { y: 0.267, rx: 0.024, f: 0.026, b: 0.028 },
    { y: 0.27, rx: 0.0, f: 0.0, b: 0.0 },
  ].map((r) => ({ ...r, z: -0.006, p: 2.1 }));
  add(loft(helmetRings, 20, { base: look.helmet }), { at: H(), color: look.helmet, skin: "head", rough: 0.32, ao: false });
  // Nervio central: franja levantada de adelante hacia atrás por arriba de la cúpula.
  const crest = [0.148, 0.19, 0.225, 0.252, 0.267, 0.27];
  for (const th of [0, Math.PI]) add(patch(helmetRings, crest, th - 0.11, th + 0.11, [0.0, 0.007, 0.008, 0.008, 0.007, 0.006], 2), { at: H(), color: look.helmet, skin: "head", rough: 0.32, ao: false });
  // Barboquejo: elipse fina que baja desde los costados del casco hasta el mentón.
  add(new THREE.TorusGeometry(1, 0.05, 3, 18).scale(0.088, 0.09, 0.088), { at: H(0, 0.055, 0.02, -0.4), color: "#2a2b2d", skin: "head", rough: 0.6 });
  if (look.earmuffs) {
    for (const sx of [1, -1]) {
      add(loft([{ y: 0, rx: 0, f: 0 }, { y: 0.004, rx: 0.036, f: 0.042 }, { y: 0.024, rx: 0.034, f: 0.04 }, { y: 0.03, rx: 0, f: 0 }], 12).rotateZ(-sx * Math.PI / 2), { at: H(sx * 0.074, 0.1, -0.006), color: "#c8352b", skin: "head", rough: 0.45, ao: false });
      add(new THREE.BoxGeometry(0.008, 0.04, 0.014), { at: H(sx * 0.098, 0.115, -0.006, 0, 0, sx * 0.1), color: "#3a3c3e", skin: "head" });
    }
  }

  // ---------------- tableta en la mano izquierda
  if (look.tablet) {
    // Se sostiene con la mano de canto y los dedos por detrás (como un portapapeles);
    // con el antebrazo doblado la pantalla queda mirando a la cara.
    const T = (dx: number, dy: number, dz: number) => at("handL", -0.06 + dx, -0.08 + dy, 0.06 + dz);
    add(new THREE.BoxGeometry(0.205, 0.015, 0.152), { at: T(0, 0, 0), color: "#1b1d1f", skin: "handL", rough: 0.5 });
    for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(new THREE.BoxGeometry(0.03, 0.021, 0.03), { at: T(cx * 0.092, 0, cz * 0.066), color: "#e0a018", skin: "handL", rough: 0.6 });
    const scr = (w: number, d: number, x: number, z: number, color: string, glow: number) =>
      add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), { at: T(x, 0.0078, z), color, skin: "handL", glow, rough: 0.15, ao: false });
    scr(0.17, 0.118, 0, 0, "#0f3a4d", 2 + 0.9);
    // Interfaz esbozada: barra superior, dos tarjetas y un gráfico de barras.
    const ui = (w: number, d: number, x: number, z: number, color: string) =>
      add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), { at: T(x, 0.0082, z), color, skin: "handL", glow: 2 + 1.1, rough: 0.15, ao: false });
    ui(0.17, 0.016, 0, 0.051, "#5fd7ff");
    ui(0.07, 0.035, -0.045, 0.02, "#3fa2c9");
    ui(0.07, 0.035, 0.045, 0.02, "#e0a018");
    [0.02, 0.032, 0.026, 0.04, 0.03].forEach((h, i) => ui(0.012, h, -0.06 + i * 0.03, -0.045 + h / 2 - 0.02, "#7fe0a0"));
  }

  const geo = mergeGeometries(L, false);
  L.forEach((g) => g.dispose());
  if (!geo) throw new Error("AssemblyWorkers: las piezas no tienen los mismos atributos");
  return geo;
}

// ------------------------------------------------------------- material --

const glowUniform = { value: 0.8 };
let workerMat: THREE.MeshStandardMaterial | null = null;
function workerMaterial() {
  if (workerMat) return workerMat;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0.02 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.glowStrength = glowUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float glow;\nattribute float rough;\nvarying float vGlow;\nvarying float vRough;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlow = glow;\nvRough = rough;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float glowStrength;\nvarying float vGlow;\nvarying float vRough;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vRough;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * (vGlow >= 2.0 ? vGlow - 2.0 : vGlow * glowStrength);");
  };
  m.customProgramCacheKey = () => "worker-glow-rough";
  workerMat = m;
  return m;
}

// ------------------------------------------------------------ esqueleto --

type Rig = { mesh: THREE.SkinnedMesh; bones: Bones };

function makeRig(look: WorkerLook): Rig {
  const geo = buildWorker(look);
  const bones = {} as Bones;
  for (const n of BONES) {
    const b = new THREE.Bone();
    b.name = n;
    bones[n] = b;
  }
  for (const n of BONES) {
    const p = PARENT[n];
    const [x, y, z] = REST[n];
    if (p) {
      const [px, py, pz] = REST[p];
      bones[n].position.set(x - px, y - py, z - pz);
      bones[p].add(bones[n]);
    } else bones[n].position.set(x, y, z);
  }
  const mesh = new THREE.SkinnedMesh(geo, workerMaterial());
  mesh.add(bones.hips);
  mesh.scale.setScalar(look.height);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(BONES.map((n) => bones[n])));
  // Esfera fija que contiene cualquier pose: permite descartar al operario
  // fuera de cuadro sin recalcular la malla deformada cada vez.
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.25);
  return { mesh, bones };
}

/** Pone la pose base (todo en cero) antes de aplicar la del cuadro. */
function resetPose(b: Bones) {
  for (const n of BONES) b[n].rotation.set(0, 0, 0);
  b.hips.position.set(...REST.hips);
}

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};
/** Pseudoaleatorio estable en [0, 1). */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Mirada con pausas: cada `every` segundos elige otro punto y gira la cabeza
 * rápido hacia él (como la gente: mira, se queda, cambia), no un seno continuo.
 */
function gaze(t: number, seed: number, every: number, yawAmp: number, pitchAmp: number) {
  const u = t / every + seed;
  const k = Math.floor(u);
  const f = smooth((u - k) / 0.18);
  const y0 = (hash(k - 1 + seed * 7) * 2 - 1) * yawAmp;
  const y1 = (hash(k + seed * 7) * 2 - 1) * yawAmp;
  const p0 = (hash(k - 1 + seed * 13 + 50) * 2 - 1) * pitchAmp;
  const p1 = (hash(k + seed * 13 + 50) * 2 - 1) * pitchAmp;
  return { yaw: y0 + (y1 - y0) * f, pitch: p0 + (p1 - p0) * f };
}

/**
 * De pie: respiración (pecho y hombros), cambio de peso de una pierna a la
 * otra con meseta (la cadera se corre y se inclina, la otra rodilla afloja) y
 * brazos relajados. `amount` lo apaga mientras camina.
 */
function stand(b: Bones, t: number, seed: number, amount: number, freeArms: { L: boolean; R: boolean }) {
  const breath = Math.sin(t * 1.5 + seed);
  b.chest.rotation.x -= 0.02 * breath;
  b.shoulderL.rotation.z += 0.015 * breath;
  b.shoulderR.rotation.z -= 0.015 * breath;
  const w = Math.tanh(3 * Math.sin(t * 0.16 + seed * 2.3)) * amount; // −1..1: peso a la derecha / izquierda
  const d = 0.024 * w;
  b.hips.position.x += d;
  b.hips.rotation.z += 0.045 * w;
  b.spine.rotation.z -= 0.035 * w;
  b.chest.rotation.z -= 0.012 * w;
  // Los pies se quedan donde estaban: las piernas compensan el corrimiento.
  for (const s of ["L", "R"] as const) b[`thigh${s}`].rotation.z += -0.045 * w - d / 0.85;
  const freeR = Math.max(0, w);
  const freeL = Math.max(0, -w);
  b.thighR.rotation.x -= 0.07 * freeR;
  b.shinR.rotation.x += 0.15 * freeR;
  b.footR.rotation.x -= 0.08 * freeR;
  b.thighL.rotation.x -= 0.07 * freeL;
  b.shinL.rotation.x += 0.15 * freeL;
  b.footL.rotation.x -= 0.08 * freeL;
  if (freeArms.L) {
    b.armL.rotation.z += 0.07 + 0.01 * breath;
    b.foreL.rotation.x -= 0.14;
    b.handL.rotation.y -= 0.2;
  }
  if (freeArms.R) {
    b.armR.rotation.z -= 0.07 + 0.01 * breath;
    b.foreR.rotation.x -= 0.14;
    b.handR.rotation.y += 0.2;
  }
}

/**
 * Ciclo de caminata: `phase` en radianes (un paso = π). Pierna izquierda
 * adelante con sin(phase) = 1. Brazos en contrafase con las piernas, pelvis y
 * pecho girando en sentidos opuestos, la cadera cae del lado de la pierna en
 * el aire y se corre hacia la de apoyo, la cabeza compensa para mirar al frente.
 */
function walkPose(b: Bones, phase: number, amount: number, swingL: boolean) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const a = amount;
  b.thighL.rotation.x = -0.45 * s * a;
  b.thighR.rotation.x = 0.45 * s * a;
  // La rodilla se dobla en el balanceo (pico apenas después del despegue).
  const knee = (ph: number) => 0.08 + 0.72 * Math.max(0, Math.cos(ph + 0.4)) ** 1.3;
  b.shinL.rotation.x = knee(phase) * a;
  b.shinR.rotation.x = knee(phase + Math.PI) * a;
  // Pie: talón al apoyar, punta al despegar.
  b.footL.rotation.x = (-0.15 * s + 0.25 * Math.max(0, -s) * Math.max(0, c + 0.2)) * a;
  b.footR.rotation.x = (0.15 * s + 0.25 * Math.max(0, s) * Math.max(0, -c + 0.2)) * a;
  // Rebote: abajo en el doble apoyo, arriba en el medio del paso.
  b.hips.position.y = REST.hips[1] - 0.03 * a + 0.024 * Math.abs(c) * a;
  b.hips.rotation.y = -0.1 * s * a;
  b.hips.rotation.z = -0.05 * c * a;
  b.hips.position.x = -0.018 * c * a;
  for (const k of ["L", "R"] as const) b[`thigh${k}`].rotation.z = (0.05 * c + 0.018 * c / 0.85) * a;
  b.spine.rotation.x = 0.05 * a;
  b.spine.rotation.z = 0.035 * c * a;
  b.chest.rotation.y = 0.16 * s * a;
  b.head.rotation.y = -0.05 * s * a;
  // Brazos: el derecho va adelante con la pierna izquierda; el codo se dobla más adelante.
  b.armR.rotation.x = -0.4 * s * a;
  b.armR.rotation.z = -0.08 * a;
  b.foreR.rotation.x = (-0.22 - 0.25 * Math.max(0, s)) * a;
  if (swingL) {
    b.armL.rotation.x = 0.4 * s * a;
    b.armL.rotation.z = 0.08 * a;
    b.foreL.rotation.x = (-0.22 - 0.25 * Math.max(0, -s)) * a;
  }
}

/** Sostener la tableta delante del pecho; `look` = cuánto la mira. */
function tabletPose(b: Bones, look: number) {
  b.armL.rotation.x = -0.35;
  b.armL.rotation.z = -0.1;
  // Rotación interna del hombro: el antebrazo cruza hacia el centro del pecho.
  b.armL.rotation.y = -0.45;
  b.foreL.rotation.x = -1.25;
  b.handL.rotation.x = 0.2;
  b.head.rotation.x += 0.35 * look;
  b.neck.rotation.x += 0.1 * look;
}

/**
 * Mano derecha sobre la pantalla: `reach` la lleva a la tableta, `tap` marca
 * los toques (golpecitos del índice simulados con la muñeca) y `swipe` la
 * desliza de lado a lado.
 */
function tapTablet(b: Bones, reach: number, tap: number, swipe: number) {
  b.armR.rotation.x += (-0.5 - b.armR.rotation.x) * reach;
  b.armR.rotation.z += (0.12 - b.armR.rotation.z) * reach;
  b.armR.rotation.y = (0.75 + 0.12 * swipe) * reach;
  b.foreR.rotation.x += (-1.45 - b.foreR.rotation.x) * reach;
  b.handR.rotation.x = (0.25 + 0.3 * tap) * reach;
  b.handR.rotation.z = -0.4 * reach;
}

// ------------------------------------------------------------ componentes --

export type WorkerKind = "driver" | "console" | "walker" | "inspector";

/** Cada operario es una persona distinta: tono de piel, pelo, complexión, equipo. */
const LOOKS: Record<WorkerKind, Omit<WorkerLook, "vest" | "helmet">> = {
  // Conductor del autoelevador: altura 1 (entra justo en el asiento), arremangado.
  driver: {
    skin: "#a87a5c", hair: "#1c1612", pants: "#23283a", shirt: "#3d4448", gloves: "#3b3d3f", boots: "#2a2421",
    hairStyle: "buzz", beard: "stache", glasses: "clear", sleeves: "rolled",
    tablet: false, radio: "chest", harness: false, kneepads: false, earmuffs: false,
    build: { sh: 1.04, waist: 1.04, hip: 1, belly: 0.012, bust: 0 }, height: 1,
  },
  // Operador de consola: robusto, con barba, protectores auditivos y radio al pecho.
  console: {
    skin: "#c39274", hair: "#3a2a1e", pants: "#262b38", shirt: "#2c3a4f", gloves: "#1f2022", boots: "#3a2a1f",
    hairStyle: "short", beard: "beard", glasses: "clear", sleeves: "long",
    tablet: false, radio: "chest", harness: false, kneepads: false, earmuffs: true,
    build: { sh: 1.06, waist: 1.08, hip: 1.02, belly: 0.026, bust: 0 }, height: 1.0,
  },
  // Caminante: mujer, cola de caballo, más baja y de hombros más angostos.
  walker: {
    skin: "#8d6248", hair: "#120d0b", pants: "#2a2f3b", shirt: "#4a4f55", gloves: "#c9b43a", boots: "#2a2421",
    hairStyle: "ponytail", beard: "none", glasses: "clear", sleeves: "rolled",
    tablet: true, radio: "belt", harness: false, kneepads: false, earmuffs: false,
    build: { sh: 0.92, waist: 0.9, hip: 1.05, belly: 0, bust: 0.014 }, height: 0.95,
  },
  // Técnico: alto y flaco, anteojos oscuros, arnés y rodilleras.
  inspector: {
    skin: "#e2b598", hair: "#8a5a32", pants: "#2c2a26", shirt: "#2e3235", gloves: "#3b3d3f", boots: "#5a3a22",
    hairStyle: "short", beard: "none", glasses: "tinted", sleeves: "long",
    tablet: true, radio: "none", harness: true, kneepads: true, earmuffs: false,
    build: { sh: 1.02, waist: 0.95, hip: 0.98, belly: 0, bust: 0 }, height: 1.04,
  },
};

/**
 * Un operario. `kind` elige la persona y la animación:
 *  - driver: sentado (va dentro del autoelevador), mira alrededor;
 *  - console: de pie frente a la consola, con las manos en el panel;
 *  - walker: recorre la senda peatonal ida y vuelta, se detiene a mirar;
 *  - inspector: revisa la selladora con la tableta.
 */
export function Worker({ kind, position, rotationY = 0, vest, helmet }: { kind: WorkerKind; position: [number, number, number]; rotationY?: number; vest: string; helmet: string }) {
  const look = LOOKS[kind];
  const rig = useMemo(() => makeRig({ ...LOOKS[kind], vest, helmet }), [kind, vest, helmet]);
  useEffect(() => () => rig.mesh.geometry.dispose(), [rig]);
  const root = useRef<THREE.Group>(null);
  const seed = useMemo(() => kind.length * 1.7, [kind]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = rig.bones;
    resetPose(b);
    if (kind === "driver") {
      b.hips.position.y = REST.hips[1];
      b.thighL.rotation.x = b.thighR.rotation.x = -1.45;
      b.shinL.rotation.x = b.shinR.rotation.x = 1.35;
      b.thighL.rotation.z = 0.08;
      b.thighR.rotation.z = -0.08;
      // Manos al volante con pequeñas correcciones.
      const steer = 0.06 * Math.sin(t * 0.7) + 0.03 * Math.sin(t * 1.9);
      b.armL.rotation.x = -0.75 + steer;
      b.armR.rotation.x = -0.75 - steer;
      b.foreL.rotation.x = b.foreR.rotation.x = -0.75;
      b.armL.rotation.z = 0.12;
      b.armR.rotation.z = -0.12;
      const g = gaze(t, seed, 3.4, 0.75, 0.12);
      b.head.rotation.y = g.yaw;
      b.neck.rotation.y = g.yaw * 0.3;
      b.head.rotation.x = g.pitch;
      b.chest.rotation.y = g.yaw * 0.12;
      b.chest.rotation.x = 0.04 + 0.02 * Math.sin(t * 1.5);
    } else if (kind === "console") {
      // Manos sobre el panel; teclea a ráfagas y cada tanto mira la cinta.
      b.armL.rotation.x = b.armR.rotation.x = -0.55;
      b.foreL.rotation.x = b.foreR.rotation.x = -0.7;
      b.armL.rotation.z = -0.15;
      b.armR.rotation.z = 0.15;
      const burst = smooth(Math.sin(t * 0.7) * 2);
      const tapR = Math.max(0, Math.sin(t * 9)) * burst;
      const tapL = Math.max(0, Math.sin(t * 9 + 2.1)) * burst * 0.7;
      b.foreR.rotation.x -= 0.12 * tapR;
      b.handR.rotation.x = 0.3 * tapR;
      b.foreL.rotation.x -= 0.1 * tapL;
      b.handL.rotation.x = 0.25 * tapL;
      const glance = smooth((Math.sin(t * 0.21 + 2) - 0.6) * 4);
      const g = gaze(t, seed, 2.6, 0.18, 0.06);
      b.head.rotation.x = 0.35 * (1 - glance) + g.pitch;
      b.head.rotation.y = -0.9 * glance + g.yaw * (1 - glance);
      b.chest.rotation.y = -0.2 * glance;
      b.spine.rotation.x = 0.08;
      stand(b, t, seed, 0.6, { L: false, R: false });
    } else if (kind === "inspector") {
      tabletPose(b, 0);
      // Ciclo: mira la máquina → anota en la tableta → señala → vuelve.
      const up = smooth((Math.sin(t * 0.33 + 0.5) - 0.3) * 3);
      const point = smooth((Math.sin(t * 0.17 + 4) - 0.75) * 6);
      const write = (1 - up) * (1 - point);
      b.head.rotation.x = 0.38 * (1 - up) - 0.06 * up;
      const g = gaze(t, seed, 2.2, 0.35, 0.05);
      b.head.rotation.y = (0.25 + g.yaw) * up;
      b.neck.rotation.x = 0.1 * (1 - up);
      tapTablet(b, write, Math.max(0, Math.sin(t * 7)) * smooth(Math.sin(t * 1.3) * 3), Math.sin(t * 0.9));
      b.armR.rotation.x += (-1.2 - b.armR.rotation.x) * point;
      b.armR.rotation.z += (0.25 - b.armR.rotation.z) * point;
      b.foreR.rotation.x += (-0.3 - b.foreR.rotation.x) * point;
      b.chest.rotation.y = 0.15 * point;
      stand(b, t, seed, 1, { L: false, R: write + point < 0.05 });
    }
    if (kind === "walker" && root.current) walkerFrame(t, b, root.current, look.height);
  });

  return (
    <group ref={root} position={position} rotation-y={rotationY}>
      <primitive object={rig.mesh} />
    </group>
  );
}

/*
 * Recorrido del caminante: senda peatonal junto a la pata de entrada
 * (x = LANE_X), entre la pila de pallets del fondo y la consola.
 */
const LANE_X = -6.75;
const WALK = { z0: -8.3, z1: -3.1, speed: 1.05 };
const LEG = (WALK.z1 - WALK.z0) / WALK.speed;
const STOP_A = 5.0; // mirando la línea (gira hacia +X)
const STOP_B = 4.0; // revisando los pallets del fondo (gira hacia −X)
const TURN = 1.2;
const PERIOD = LEG + TURN + STOP_A + TURN + LEG + TURN + STOP_B + TURN;

function walkerFrame(time: number, b: Bones, root: THREE.Group, height: number) {
  let t = time % PERIOD;
  let z = WALK.z0;
  let yaw = 0;
  let walking = 0;
  let dist = 0;
  let look = 0;
  let stopA = 0;
  const seg = (d: number) => {
    const r = t < d;
    if (!r) t -= d;
    return r;
  };
  if (seg(LEG)) {
    dist = t * WALK.speed;
    z = WALK.z0 + dist;
    walking = 1;
  } else if (seg(TURN)) {
    z = WALK.z1;
    yaw = (Math.PI / 2) * smooth(t / TURN);
  } else if (seg(STOP_A)) {
    z = WALK.z1;
    yaw = Math.PI / 2;
    look = smooth(t / 0.8) * (1 - smooth((t - STOP_A + 0.8) / 0.8));
    stopA = look;
  } else if (seg(TURN)) {
    z = WALK.z1;
    yaw = Math.PI / 2 + (Math.PI / 2) * smooth(t / TURN);
  } else if (seg(LEG)) {
    dist = t * WALK.speed;
    z = WALK.z1 - dist;
    yaw = Math.PI;
    walking = 1;
  } else if (seg(TURN)) {
    z = WALK.z0;
    yaw = Math.PI + (Math.PI / 2) * smooth(t / TURN);
  } else if (seg(STOP_B)) {
    z = WALK.z0;
    yaw = (Math.PI * 3) / 2;
    look = 0.6;
  } else {
    z = WALK.z0;
    yaw = (Math.PI * 3) / 2 + (Math.PI / 2) * smooth(t / TURN);
  }
  root.position.set(LANE_X, 0, z);
  root.rotation.y = yaw;
  // Fase según la distancia: un paso cada 0,72 × altura (sin patinar).
  const phase = (dist / (0.72 * height)) * Math.PI;
  // Arranque y frenada suaves (las piernas se cierran al parar).
  const amount = walking ? Math.min(1, dist / 0.4, (WALK.z1 - WALK.z0 - dist) / 0.4 + 0.15) : 0;
  walkPose(b, phase, amount, false);
  tabletPose(b, 0.35 + 0.65 * look);
  if (walking) b.head.rotation.x = 0.12;
  else {
    // Parada: mira alrededor y, frente a la línea, anota en la tableta.
    const g = gaze(time, 3.1, 1.9, 0.55, 0.08);
    b.head.rotation.y = g.yaw * (1 - stopA);
    tapTablet(b, stopA, Math.max(0, Math.sin(time * 8)) * smooth(Math.sin(time * 1.1) * 3), Math.sin(time * 0.8));
    stand(b, time, 3.1, 1 - walking, { L: false, R: stopA < 0.05 });
  }
  if (walking) b.head.rotation.y += 0.25 * Math.sin(time * 0.5);
}

/** Los tres operarios a pie de la línea (el cuarto maneja el autoelevador). */
export default function AssemblyWorkers({ theme }: { theme: Theme }) {
  glowUniform.value = theme === "dark" ? 0.9 : 0.15;
  return (
    <group>
      {/* operador al costado de la consola (consola en (−5,3; −3,9) girada 0,5): no tapa la pantalla */}
      <Worker kind="console" position={[-4.35, 0, -4.1]} rotationY={-1.35} vest="#d9a400" helmet="#e9ecee" />
      <Worker kind="walker" position={[LANE_X, 0, WALK.z0]} vest="#e8731a" helmet="#d9a400" />
      {/* técnico revisando la selladora, detrás de la cinta */}
      <Worker kind="inspector" position={[4.0, 0, -6.9]} rotationY={-0.58} vest="#e8731a" helmet="#e9ecee" />
    </group>
  );
}
