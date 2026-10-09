import * as THREE from "three";
import { rng } from "./forestScatter";

/**
 * Geometrías del bosque, armadas a mano con un constructor mínimo: troncos
 * afinados con ruido y raíces, ramas, follaje de tarjetas cruzadas
 * (texturas alfa de ramitos de hojas) y piezas de sotobosque. Cada función devuelve una
 * geometría "unitaria" que después se repite con InstancedMesh.
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
export type RGB = [number, number, number];

export class MeshBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private colors: number[] = [];
  private indices: number[] = [];
  private count = 0;

  /** Índice que tendrá el próximo vértice. */
  get size() {
    return this.count;
  }

  vertex(p: THREE.Vector3, n: THREE.Vector3, u: number, v: number, c: number | RGB = 1) {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.uvs.push(u, v);
    if (typeof c === "number") this.colors.push(c, c, c);
    else this.colors.push(...c);
    return this.count++;
  }

  tri(a: number, b: number, c: number) {
    this.indices.push(a, b, c);
  }

  quad(a: number, b: number, c: number, d: number) {
    this.indices.push(a, b, c, a, c, d);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    // Los colores se escriben "a ojo" en sRGB; three los espera lineales.
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.colors.map((c) => Math.pow(c, 2.2)), 3));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export type TubeOptions = {
  path: (t: number) => THREE.Vector3;
  radius: (t: number) => number;
  radial: number;
  rings: number;
  /** Repeticiones de la textura alrededor y por metro de largo. */
  uScale?: number;
  vScale?: number;
  /** Irregularidad de la sección (fracción del radio). */
  noise?: number;
  seed?: number;
  color?: (t: number) => number | RGB;
};

/** Tubo a lo largo de una curva: troncos, ramas, troncos caídos, palitos. */
export function tube(b: MeshBuilder, o: TubeOptions) {
  const rand = rng(o.seed ?? 1);
  const lumps = Array.from({ length: o.radial }, () => (rand() - 0.5) * 2 * (o.noise ?? 0));
  const uScale = o.uScale ?? 1;
  const vScale = o.vScale ?? 1;
  const base = b.size;
  let travelled = 0;
  let prev = o.path(0);
  const n = V();
  const bn = V();
  const dir = V();
  for (let i = 0; i <= o.rings; i++) {
    const t = i / o.rings;
    const p = o.path(t);
    const e = 1e-3;
    const tan = o.path(Math.min(1, t + e)).sub(o.path(Math.max(0, t - e))).normalize();
    const ref = Math.abs(tan.y) < 0.95 ? UP : V(1, 0, 0);
    n.crossVectors(ref, tan).normalize();
    bn.crossVectors(tan, n).normalize();
    travelled += p.distanceTo(prev);
    prev = p;
    const r = o.radius(t);
    const c = o.color ? o.color(t) : 1;
    for (let j = 0; j <= o.radial; j++) {
      const a = (j / o.radial) * Math.PI * 2;
      const jj = j % o.radial;
      dir.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(bn, Math.sin(a));
      const lump = 1 + lumps[jj] * (0.6 + 0.4 * Math.sin(i * 1.9 + jj * 2.3));
      b.vertex(p.clone().addScaledVector(dir, r * lump), dir.clone(), (j / o.radial) * uScale, travelled * vScale, c);
    }
  }
  const row = o.radial + 1;
  for (let i = 0; i < o.rings; i++) {
    for (let j = 0; j < o.radial; j++) {
      const a = base + i * row + j;
      b.quad(a, a + 1, a + row + 1, a + row);
    }
  }
}

/**
 * Tarjeta (quad) de follaje: `axis` es la dirección de la ramita (u de la
 * textura) y `side` el ancho (v). Las normales salen de `normalOf` (normales
 * "esféricas" respecto del centro de la copa: así la copa se ilumina como un
 * volumen y no como planos sueltos).
 */
function card(
  b: MeshBuilder,
  center: THREE.Vector3,
  axis: THREE.Vector3,
  side: THREE.Vector3,
  len: number,
  wid: number,
  normalOf: (p: THREE.Vector3) => THREE.Vector3,
  shade: (p: THREE.Vector3) => number
) {
  const corners: [number, number, number, number][] = [
    [-0.5, -0.5, 0, 0],
    [0.5, -0.5, 1, 0],
    [0.5, 0.5, 1, 1],
    [-0.5, 0.5, 0, 1],
  ];
  const ids = corners.map(([a, s, u, v]) => {
    const p = center.clone().addScaledVector(axis, a * len).addScaledVector(side, s * wid);
    return b.vertex(p, normalOf(p), u, v, shade(p));
  });
  b.quad(ids[0], ids[1], ids[2], ids[3]);
}

/** Par de tarjetas cruzadas a lo largo de una ramita (una "plana" y una "parada"). */
function crossedCards(
  b: MeshBuilder,
  center: THREE.Vector3,
  axis: THREE.Vector3,
  len: number,
  wid: number,
  roll: number,
  normalOf: (p: THREE.Vector3) => THREE.Vector3,
  shade: (p: THREE.Vector3) => number
) {
  const ref = Math.abs(axis.y) > 0.9 ? V(1, 0, 0) : UP;
  const s1 = V().crossVectors(axis, ref).normalize();
  const s2 = V().crossVectors(axis, s1).normalize();
  s1.applyAxisAngle(axis, roll);
  s2.applyAxisAngle(axis, roll);
  card(b, center, axis, s1, len, wid, normalOf, shade);
  card(b, center, axis, s2, len, wid, normalOf, shade);
}

/** Normal "esférica" (aplastada en y) respecto de un centro, inclinada hacia arriba. */
const sphericalNormal = (c: THREE.Vector3, upBias = 0.35) => (p: THREE.Vector3) =>
  V(p.x - c.x, (p.y - c.y) * 0.6, p.z - c.z).normalize().addScaledVector(UP, upBias).normalize();

const dirFrom = (yaw: number, elev: number) => V(Math.cos(yaw) * Math.cos(elev), Math.sin(elev), Math.sin(yaw) * Math.cos(elev));

// ---- Árboles de hoja ancha -------------------------------------------------------

type CrownSpec = {
  seed: number;
  /** Centro y radios del elipsoide de la copa. */
  center: THREE.Vector3;
  radii: THREE.Vector3;
  lobes: number;
  cardsPerLobe: number;
  cardSize: [number, number];
};

/**
 * Copa frondosa: varios "lóbulos" (racimos) dentro de un elipsoide, cada uno
 * con tarjetas cruzadas de ramitos de hojas. Normales esféricas respecto del
 * centro de la copa y sombreado por vértice (más oscuro adentro y abajo) para
 * que se lea como un volumen y no como planos sueltos.
 */
function crown(leaves: MeshBuilder, spec: CrownSpec) {
  const rand = rng(spec.seed);
  const { center, radii } = spec;
  const normalOf = sphericalNormal(center, 0.3);
  const shade = (p: THREE.Vector3) => {
    const d = V((p.x - center.x) / radii.x, (p.y - center.y) / radii.y, (p.z - center.z) / radii.z);
    return 0.38 + 0.62 * Math.min(1, Math.max(0, d.length() * 0.75 + d.y * 0.3));
  };
  const lobes: { c: THREE.Vector3; r: number }[] = [];
  for (let i = 0; i < spec.lobes; i++) {
    // Más lóbulos hacia la superficie: la copa se ve llena y con borde irregular.
    const u = V(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
    const k = 0.45 + Math.sqrt(rand()) * 0.4;
    const c = center.clone().add(V(u.x * radii.x * k, u.y * radii.y * k, u.z * radii.z * k));
    lobes.push({ c, r: (radii.x + radii.y + radii.z) / 3 * (0.38 + rand() * 0.18) });
  }
  for (const lobe of lobes) {
    for (let j = 0; j < spec.cardsPerLobe; j++) {
      const u = V(rand() * 2 - 1, rand() * 1.6 - 0.6, rand() * 2 - 1).normalize();
      const p = lobe.c.clone().addScaledVector(u, lobe.r * (0.55 + rand() * 0.45));
      const out = p.clone().sub(center).normalize();
      const axis = u.clone().multiplyScalar(0.7).addScaledVector(out, 0.5).add(V(0, 0.15, 0)).normalize();
      const size = spec.cardSize[0] + rand() * (spec.cardSize[1] - spec.cardSize[0]);
      crossedCards(leaves, p, axis, size, size * 0.95, rand() * Math.PI, normalOf, shade);
    }
  }
  return lobes;
}

type BroadleafSpec = {
  seed: number;
  /** Altura donde el tronco se abre en ramas. */
  forkY: number;
  baseR: number;
  lean: (t: number) => THREE.Vector3;
  roots: number;
  crown: Omit<CrownSpec, "seed">;
};

/** Árbol de hoja ancha: tronco con raíces a la vista, ramas principales y copa frondosa. */
function broadleaf(spec: BroadleafSpec) {
  const rand = rng(spec.seed);
  const bark = new MeshBuilder();
  const axisAt = (t: number) => spec.lean(t).add(V(0, t * spec.forkY, 0));
  const radiusAt = (t: number) => spec.baseR * (1 - 0.3 * t) + spec.baseR * 0.6 * Math.exp(-t * spec.forkY * 3);
  tube(bark, { path: axisAt, radius: radiusAt, radial: 10, rings: 8, uScale: 2, vScale: 0.7, noise: 0.14, seed: spec.seed });

  // Raíces: salen del pie del tronco y se hunden en la tierra.
  for (let i = 0; i < spec.roots; i++) {
    const a = (i / spec.roots) * Math.PI * 2 + rand() * 0.6;
    const len = spec.baseR * (3.5 + rand() * 3);
    const out = V(Math.cos(a), 0, Math.sin(a));
    const h0 = spec.baseR * (1.2 + rand() * 0.6);
    tube(bark, {
      path: (s) => out.clone().multiplyScalar(spec.baseR * 0.55 + s * len).add(V(0, h0 * Math.pow(1 - s, 1.8) - 0.05 * s, 0)),
      radius: (s) => spec.baseR * (0.42 * (1 - s) + 0.06),
      radial: 5,
      rings: 4,
      uScale: 1,
      vScale: 0.8,
      noise: 0.1,
      seed: spec.seed + i,
    });
  }

  const leaves = new MeshBuilder();
  const lobes = crown(leaves, { seed: spec.seed + 50, ...spec.crown });
  // Ramas principales desde la horqueta hacia algunos lóbulos.
  const fork = axisAt(1);
  lobes.forEach((lobe, i) => {
    if (i % 2 && i > 3) return;
    const end = fork.clone().lerp(lobe.c, 0.8);
    const bow = rand() * 0.4;
    tube(bark, {
      path: (s) => fork.clone().lerp(end, s).add(V(0, Math.sin(s * Math.PI) * bow, 0)),
      radius: (s) => spec.baseR * (0.55 * (1 - s) + 0.12),
      radial: 6,
      rings: 3,
      uScale: 1,
      vScale: 0.7,
      seed: spec.seed + 100 + i,
    });
  });
  return { bark: bark.build(), leaves: leaves.build() };
}

/** Roble: tronco grueso y bajo, copa ancha que cae casi hasta la altura de una persona. */
export function oakTree() {
  return broadleaf({
    seed: 3,
    forkY: 2.1,
    baseR: 0.32,
    lean: (t) => V(Math.sin(t * 2) * 0.12, 0, Math.sin(t * 1.3) * 0.08),
    roots: 6,
    crown: { center: V(0.2, 4.5, 0), radii: V(3.7, 2.3, 3.5), lobes: 11, cardsPerLobe: 9, cardSize: [1.3, 1.9] },
  });
}

/** Árbol de copa redonda, más alto (tipo tilo / fresno). */
export function roundTree() {
  return broadleaf({
    seed: 7,
    forkY: 2.8,
    baseR: 0.25,
    lean: (t) => V(t * t * 0.3, 0, Math.sin(t * 2.5) * 0.1),
    roots: 5,
    crown: { center: V(0.3, 5.6, 0), radii: V(2.7, 3.0, 2.7), lobes: 10, cardsPerLobe: 9, cardSize: [1.2, 1.7] },
  });
}

/** Árbol joven: tronco fino, copa baja y chica (se ve entera en el encuadre). */
export function smallTree() {
  return broadleaf({
    seed: 13,
    forkY: 1.1,
    baseR: 0.11,
    lean: (t) => V(Math.sin(t * 3) * 0.06, 0, 0),
    roots: 3,
    crown: { center: V(0, 2.5, 0), radii: V(1.5, 1.4, 1.5), lobes: 6, cardsPerLobe: 8, cardSize: [0.8, 1.15] },
  });
}

/** Arbusto: solo copa, apoyado en el suelo. */
export function bush() {
  const leaves = new MeshBuilder();
  crown(leaves, { seed: 21, center: V(0, 0.55, 0), radii: V(1.0, 0.6, 1.0), lobes: 4, cardsPerLobe: 7, cardSize: [0.6, 0.85] });
  return leaves.build();
}

/** Tronco lejano: cilindro afinado sin ramas (se pierde en la bruma). */
export function farTrunk() {
  const b = new MeshBuilder();
  tube(b, {
    path: (t) => V(0, t, 0),
    radius: (t) => 1 - 0.7 * t,
    radial: 7,
    rings: 3,
    uScale: 2,
    vScale: 7,
  });
  return b.build();
}

// ---- Sotobosque ----------------------------------------------------------------

/** Mata de pasto: hojas finas curvadas, oscuras en la base y claras en la punta. */
export function grassTuft() {
  const rand = rng(77);
  const b = new MeshBuilder();
  const baseC: RGB = [0.16, 0.26, 0.09];
  const midC: RGB = [0.36, 0.54, 0.2];
  const tipC: RGB = [0.62, 0.74, 0.34];
  const blades = 12;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + rand();
    const out = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-out.z, 0, out.x);
    const h = 0.28 + rand() * 0.34;
    const lean = 0.25 + rand() * 0.5;
    const w = 0.022 + rand() * 0.014;
    const root = out.clone().multiplyScalar(rand() * 0.05);
    const nrm = out.clone().multiplyScalar(0.35).add(UP).normalize();
    const mid = root.clone().addScaledVector(out, lean * h * 0.3).add(V(0, h * 0.58, 0));
    const tip = root.clone().addScaledVector(out, lean * h).add(V(0, h * 0.9, 0));
    const v0 = b.vertex(root.clone().addScaledVector(side, -w), nrm, 0, 0, baseC);
    const v1 = b.vertex(root.clone().addScaledVector(side, w), nrm, 1, 0, baseC);
    const v2 = b.vertex(mid.clone().addScaledVector(side, w * 0.7), nrm, 1, 0.5, midC);
    const v3 = b.vertex(mid.clone().addScaledVector(side, -w * 0.7), nrm, 0, 0.5, midC);
    const v4 = b.vertex(tip, nrm, 0.5, 1, tipC);
    b.quad(v0, v1, v2, v3);
    b.tri(v3, v2, v4);
  }
  return b.build();
}

/** Mata de helecho: frondas arqueadas en abanico (textura alfa). */
export function fernClump() {
  const rand = rng(88);
  const b = new MeshBuilder();
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rand() * 0.6;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-out.z, 0, out.x);
    const L = 0.6 + rand() * 0.45;
    const w = 0.34 + rand() * 0.1;
    let elev = 1.05 + rand() * 0.3;
    const p = V();
    const segs = 3;
    let prevIds: [number, number] | null = null;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const nrm = out.clone().multiplyScalar(0.25).add(UP).normalize();
      const c = 0.45 + 0.55 * t;
      const ids: [number, number] = [
        b.vertex(p.clone().addScaledVector(side, -w / 2), nrm, 0, t, c),
        b.vertex(p.clone().addScaledVector(side, w / 2), nrm, 1, t, c),
      ];
      if (prevIds) b.quad(prevIds[0], prevIds[1], ids[1], ids[0]);
      prevIds = ids;
      p.addScaledVector(dirFrom(a, elev), L / segs);
      elev -= 0.45 + rand() * 0.15;
    }
  }
  return b.build();
}
