import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshBuilder, tube, type RGB } from "./forestGeometry";
import { rng } from "./forestScatter";

/*
 * Sotobosque "de cerca": rocas, troncos caídos, tocones, hongos y flores
 * silvestres armados en código. Reemplazan a los modelos low-poly de Kenney,
 * que de cerca se veían facetados y de dibujo animado al lado del brazo
 * realista. La idea en todos: normales suaves, color por vértice con
 * variación (musgo arriba, tierra abajo, cavidades más oscuras) y unidades
 * reales (metros a escala 1), así la escala de cada instancia es solo variación.
 *
 * Cada función devuelve UNA geometría que después se repite con InstancedMesh.
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tmpC = new THREE.Color();

// ---- Ruido 3D (para rocas) --------------------------------------------------------

function hash3(x: number, y: number, z: number, seed: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed + 7, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor 3D suave en [0, 1]. */
function noise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(x - xi);
  const v = s(y - yi);
  const w = s(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v), l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Escribe un color sRGB "a ojo" como lineal en el atributo. */
function setColor(attr: THREE.BufferAttribute, i: number, c: RGB) {
  tmpC.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
  attr.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
}

const lerp3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---- Rocas -------------------------------------------------------------------------

/**
 * Roca: icosaedro deformado con ruido, recortado por algunos planos (las caras
 * planas de una piedra partida), semienterrado (base aplastada) y pintado por
 * vértice: gris con vetas, cavidades oscuras, tierra al pie y musgo en lo que
 * mira hacia arriba. `radius` en metros.
 */
export function rock(seed: number, detail: number, radius: number, moss: number) {
  const rand = rng(seed);
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const stretch = V(1 + rand() * 0.35, 0.62 + rand() * 0.18, 0.85 + rand() * 0.3);
  const cuts = Array.from({ length: 5 }, () => ({ n: V(rand() * 2 - 1, rand() * 1.2 - 0.2, rand() * 2 - 1).normalize(), d: 0.62 + rand() * 0.22 }));
  const cavity = new Float32Array(pos.count);
  const v = V();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = noise3(v.x * 1.7, v.y * 1.7, v.z * 1.7, seed) * 0.34 + noise3(v.x * 4.3, v.y * 4.3, v.z * 4.3, seed + 1) * 0.13 + noise3(v.x * 10, v.y * 10, v.z * 10, seed + 2) * 0.045;
    let r = 0.78 + n;
    cavity[i] = n;
    // Caras partidas: lo que sobresale de cada plano se achata contra él.
    for (const c of cuts) {
      const d = v.dot(c.n) * r;
      if (d > c.d) r -= (d - c.d) * 0.85;
    }
    v.multiplyScalar(r).multiply(stretch);
    if (v.y < -0.18) v.y = -0.18 + (v.y + 0.18) * 0.25; // semienterrada
    pos.setXYZ(i, v.x * radius, (v.y + 0.12) * radius, v.z * radius);
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const color = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
  const p = V();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).divideScalar(radius);
    const ny = nor.getY(i);
    const vein = noise3(p.x * 3.1, p.y * 6.5, p.z * 3.1, seed + 9);
    let c: RGB = lerp3([0.42, 0.41, 0.38], [0.64, 0.62, 0.57], vein);
    c = lerp3(c, [0.26, 0.25, 0.23], smooth(0.42, 0.2, cavity[i]) * 0.7); // cavidades
    c = lerp3(c, [0.3, 0.24, 0.17], smooth(0.05, -0.12, p.y) * 0.8); // tierra al pie
    const m = smooth(0.35, 0.8, ny + (noise3(p.x * 2.6, p.y * 2.6, p.z * 2.6, seed + 5) - 0.5) * 0.9) * moss;
    c = lerp3(c, noise3(p.x * 7, p.y * 7, p.z * 7, seed + 6) > 0.5 ? [0.36, 0.47, 0.17] : [0.27, 0.38, 0.12], m);
    setColor(color, i, c);
  }
  g.setAttribute("color", color);
  g.computeBoundingSphere();
  return g;
}

/**
 * Material de las rocas: color por vértice + un detalle de grano proyectado en
 * tres planos (triplanar, en espacio del objeto: la textura acompaña a cada
 * instancia sin costuras, aunque la roca no tenga UV).
 */
export function rockMaterial(detail: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;\nvObjN = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uDetail;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 tw = pow(abs(normalize(vObjN)), vec3(4.0));
        tw /= tw.x + tw.y + tw.z;
        float grain = texture2D(uDetail, vObjPos.zy * 2.3).r * tw.x + texture2D(uDetail, vObjPos.xz * 2.3).r * tw.y + texture2D(uDetail, vObjPos.xy * 2.3).r * tw.z;
        diffuseColor.rgb *= 0.55 + 0.9 * grain;`
      );
  };
  mat.customProgramCacheKey = () => "forest-rock";
  return mat;
}

// ---- Troncos y tocones -----------------------------------------------------------

/**
 * Tapa de un tronco cortado. Truco: la corteza (la textura que ya usan los
 * árboles) tiene surcos verticales, o sea a `u` constante; si en la tapa `u`
 * es el radio, esos surcos quedan como anillos de crecimiento. El color por
 * vértice aclara la corteza hasta el tono de la madera (valores > 1 a propósito:
 * multiplican una textura oscura).
 */
function endCap(b: MeshBuilder, center: THREE.Vector3, normal: THREE.Vector3, radius: number, segments: number, seed: number) {
  const rand = rng(seed);
  const ref = Math.abs(normal.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const s = V().crossVectors(normal, ref).normalize();
  const t = V().crossVectors(normal, s).normalize();
  const wood: RGB = [1.95, 1.75, 1.38];
  const heart: RGB = [1.6, 1.3, 0.95];
  const c0 = b.vertex(center.clone().addScaledVector(normal, -0.01), normal, 0, 0, heart);
  const ring: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const r = radius * (0.92 + rand() * 0.06);
    const p = center.clone().addScaledVector(s, Math.cos(a) * r).addScaledVector(t, Math.sin(a) * r);
    ring.push(b.vertex(p, normal, 0.36, (i / segments) * 0.5, wood));
  }
  for (let i = 0; i < segments; i++) b.tri(c0, ring[i], ring[i + 1]);
}

/** Musgo en lo que mira hacia arriba: tiñe de verde el color por vértice (lineal). */
function mossTop(g: THREE.BufferGeometry, threshold: number, amount: number, seed: number) {
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < nor.count; i++) {
    const n = noise3(pos.getX(i) * 3, pos.getY(i) * 3, pos.getZ(i) * 3, seed);
    const k = smooth(threshold, threshold + 0.35, nor.getY(i) + (n - 0.5) * 0.6) * amount;
    if (k <= 0 || col.getX(i) > 2) continue; // las tapas (madera clara) no
    col.setXYZ(i, col.getX(i) * (1 - k) + 0.45 * k, col.getY(i) * (1 - k) + 1.05 * k, col.getZ(i) * (1 - k) + 0.12 * k);
  }
}

/** Tronco caído (~3 m): torcido, con dos muñones de rama, tapas cortadas y musgo arriba. */
export function fallenLog() {
  const b = new MeshBuilder();
  const L = 3;
  const R = 0.23;
  const path = (t: number) => V((t - 0.5) * L, R * 0.8 + Math.sin(t * 3.1) * 0.035, Math.sin(t * 2.3) * 0.12);
  const radius = (t: number) => R * (1 - 0.22 * t) * (1 + 0.18 * Math.exp(-t * 14));
  tube(b, { path, radius, radial: 14, rings: 12, uScale: 2, vScale: 0.7, noise: 0.07, seed: 31 });
  const dir = (t: number) => path(Math.min(1, t + 0.01)).sub(path(Math.max(0, t - 0.01))).normalize();
  endCap(b, path(0), dir(0).negate(), radius(0), 14, 1);
  endCap(b, path(1), dir(1), radius(1), 14, 2);
  for (const [t, yaw, len] of [[0.32, 0.9, 0.34], [0.7, -2.2, 0.24]] as const) {
    const o = path(t);
    const out = V(Math.cos(yaw) * 0.4, 0.75, Math.sin(yaw) * 0.6).normalize();
    tube(b, { path: (s) => o.clone().addScaledVector(out, s * len), radius: (s) => 0.06 * (1 - 0.5 * s), radial: 6, rings: 2, uScale: 1, vScale: 0.7, seed: 40 + t });
  }
  const g = b.build();
  mossTop(g, 0.25, 0.85, 3);
  return g;
}

/** Tocón (~0,5 m) con raíces que se hunden en la tierra y la tapa cortada. */
export function stump() {
  const b = new MeshBuilder();
  const R = 0.27;
  const H = 0.46;
  tube(b, { path: (t) => V(0, t * H - 0.03, 0), radius: (t) => R * (1 + 0.45 * Math.exp(-t * 7)), radial: 14, rings: 5, uScale: 2, vScale: 0.7, noise: 0.13, seed: 17 });
  const rand = rng(8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rand() * 0.5;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const len = 0.45 + rand() * 0.35;
    const h0 = 0.16 + rand() * 0.08;
    tube(b, {
      path: (s) => out.clone().multiplyScalar(R * 0.7 + s * len).add(V(0, h0 * Math.pow(1 - s, 1.6) - 0.06 * s, 0)),
      radius: (s) => R * (0.4 * (1 - s) + 0.06),
      radial: 6,
      rings: 4,
      uScale: 1,
      vScale: 0.8,
      noise: 0.1,
      seed: 60 + i,
    });
  }
  endCap(b, V(0, H - 0.03, 0), V(0, 1, 0), R * 1.01, 14, 3);
  const g = b.build();
  mossTop(g, 0.1, 0.7, 4);
  return g;
}

// ---- Hongos ------------------------------------------------------------------------

/**
 * Sólido de revolución con normales suaves a partir del perfil [radio, y]
 * (de abajo hacia arriba), transformado por `m`. Color por anillo del perfil.
 */
function revolve(b: MeshBuilder, profile: [number, number][], radial: number, m: THREE.Matrix4, color: (j: number) => RGB) {
  const nm = new THREE.Matrix3().getNormalMatrix(m);
  const rows: number[][] = [];
  profile.forEach(([r, y], j) => {
    const prev = profile[Math.max(0, j - 1)];
    const next = profile[Math.min(profile.length - 1, j + 1)];
    const dr = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const l = Math.hypot(dr, dy) || 1;
    const row: number[] = [];
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const p = V(Math.cos(a) * r, y, Math.sin(a) * r).applyMatrix4(m);
      const n = V(Math.cos(a) * (dy / l), -dr / l, Math.sin(a) * (dy / l)).applyMatrix3(nm).normalize();
      row.push(b.vertex(p, n, i / radial, j / profile.length, color(j)));
    }
    rows.push(row);
  });
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < radial; i++) b.quad(rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]);
}

/** Un hongo: pie y sombrero (con laminillas claras abajo), inclinado `tilt`. */
function mushroom(b: MeshBuilder, x: number, z: number, h: number, capR: number, tilt: number, yaw: number, cap: RGB, capEdge: RGB) {
  const m = new THREE.Matrix4().compose(V(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ")), V(1, 1, 1));
  const sr = capR * 0.2;
  const stem: RGB = [0.86, 0.82, 0.72];
  revolve(b, [[sr * 1.25, -0.01], [sr * 1.0, h * 0.45], [sr * 0.85, h]], 5, m, (j) => lerp3([0.62, 0.56, 0.44], stem, j / 2));
  const capH = capR * 0.62;
  const prof: [number, number][] = [
    [sr * 0.9, h - capH * 0.05],
    [capR * 0.8, h - capH * 0.12],
    [capR, h + capH * 0.05],
    [capR * 0.7, h + capH * 0.7],
    [0.001, h + capH],
  ];
  revolve(b, prof, 8, m, (j) => (j === 0 ? [0.78, 0.7, 0.56] : j === 1 ? [0.66, 0.58, 0.46] : lerp3(capEdge, cap, (j - 2) / 2)));
}

/** Matita de hongos: tres de color miel y uno pardo más grande. */
export function mushroomCluster() {
  const b = new MeshBuilder();
  const rand = rng(12);
  const honey: RGB = [0.72, 0.48, 0.24];
  const honeyEdge: RGB = [0.88, 0.7, 0.45];
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    const d = 0.03 + rand() * 0.06;
    mushroom(b, Math.cos(a) * d, Math.sin(a) * d, 0.05 + rand() * 0.06, 0.028 + rand() * 0.022, (rand() - 0.5) * 0.5, rand() * 6, honey, honeyEdge);
  }
  mushroom(b, 0.11, -0.04, 0.085, 0.06, 0.12, 1, [0.4, 0.24, 0.13], [0.55, 0.36, 0.2]);
  return b.build();
}

// ---- Flores ------------------------------------------------------------------------

type FlowerKind = "daisy" | "buttercup" | "bell";

const LEAF: RGB = [0.26, 0.42, 0.14];
const LEAF_TIP: RGB = [0.42, 0.58, 0.22];

/** Tallo: cinta fina que se curva, de la base al punto `top`. */
function stem(b: MeshBuilder, top: THREE.Vector3, width: number) {
  const segs = 3;
  const side = V(-top.z, 0, top.x).normalize().multiplyScalar(width / 2);
  if (side.lengthSq() === 0) side.set(width / 2, 0, 0);
  let prev: [number, number] | null = null;
  for (let k = 0; k <= segs; k++) {
    const t = k / segs;
    const p = V(top.x * t * t, top.y * t, top.z * t * t);
    const n = V(0, 0.3, 0).add(V(top.x, 0, top.z).normalize()).normalize();
    const c = lerp3(LEAF, LEAF_TIP, t);
    const ids: [number, number] = [b.vertex(p.clone().sub(side), n, 0, t, c), b.vertex(p.clone().add(side), n, 1, t, c)];
    if (prev) b.quad(prev[0], prev[1], ids[1], ids[0]);
    prev = ids;
  }
}

/** Hoja basal lanceolada, arqueada hacia afuera. */
function basalLeaf(b: MeshBuilder, yaw: number, len: number) {
  const out = V(Math.cos(yaw), 0, Math.sin(yaw));
  const side = V(-out.z, 0, out.x);
  const n = V(0, 1, 0).addScaledVector(out, 0.3).normalize();
  const mid = out.clone().multiplyScalar(len * 0.45).add(V(0, len * 0.35, 0));
  const tip = out.clone().multiplyScalar(len).add(V(0, len * 0.18, 0));
  const w = len * 0.16;
  const v0 = b.vertex(V(0, 0, 0), n, 0.5, 0, LEAF);
  const v1 = b.vertex(mid.clone().addScaledVector(side, -w), n, 0, 0.5, LEAF);
  const v2 = b.vertex(mid.clone().addScaledVector(side, w), n, 1, 0.5, LEAF);
  const v3 = b.vertex(tip, n, 0.5, 1, LEAF_TIP);
  b.tri(v0, v2, v1);
  b.tri(v1, v2, v3);
}

/**
 * Corola de pétalos sueltos alrededor de `c`: cada pétalo es un rombo curvado
 * (base, dos laterales, punta) con normales que miran arriba y afuera.
 */
function corolla(b: MeshBuilder, c: THREE.Vector3, petals: number, len: number, wid: number, cup: number, base: RGB, tip: RGB, phase: number) {
  for (let i = 0; i < petals; i++) {
    const a = phase + (i / petals) * Math.PI * 2;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-out.z, 0, out.x);
    const n = V(0, 1, 0).addScaledVector(out, 0.35 + cup).normalize();
    const mid = c.clone().addScaledVector(out, len * 0.5).add(V(0, len * cup * 0.35, 0));
    const v0 = b.vertex(c.clone().addScaledVector(out, len * 0.08), n, 0.5, 0, base);
    const v1 = b.vertex(mid.clone().addScaledVector(side, -wid / 2), n, 0, 0.5, lerp3(base, tip, 0.6));
    const v2 = b.vertex(mid.clone().addScaledVector(side, wid / 2), n, 1, 0.5, lerp3(base, tip, 0.6));
    const v3 = b.vertex(c.clone().addScaledVector(out, len).add(V(0, len * cup, 0)), n, 0.5, 1, tip);
    b.tri(v0, v2, v1);
    b.tri(v1, v2, v3);
  }
}

/** Disco central (abombado) de la flor. */
function disc(b: MeshBuilder, c: THREE.Vector3, r: number, color: RGB, rim: RGB) {
  const segs = 7;
  const top = b.vertex(c.clone().add(V(0, r * 0.5, 0)), V(0, 1, 0), 0.5, 0.5, color);
  const ring: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const d = V(Math.cos(a), 0, Math.sin(a));
    ring.push(b.vertex(c.clone().addScaledVector(d, r), V(0, 0.6, 0).add(d).normalize(), 0, 0, rim));
  }
  for (let i = 0; i < segs; i++) b.tri(top, ring[i + 1], ring[i]);
}

/** Campanita colgante (cono abierto hacia abajo). */
function bell(b: MeshBuilder, c: THREE.Vector3, r: number, h: number, color: RGB, dark: RGB) {
  const m = new THREE.Matrix4().compose(c, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI * 0.85, 0, 0.3)), V(1, 1, 1));
  revolve(b, [[0.002, 0], [r * 0.85, h * 0.5], [r * 1.25, h]], 5, m, (j) => (j < 1 ? dark : color));
}

/**
 * Mata de flores silvestres (~30 cm). Tres especies de prado que crecen en
 * manchones: margaritas (blancas), botones de oro (amarillas) y campanillas (violetas).
 */
export function flowerClump(kind: FlowerKind) {
  const b = new MeshBuilder();
  const rand = rng(kind === "daisy" ? 101 : kind === "buttercup" ? 202 : 303);
  for (let i = 0; i < 4; i++) basalLeaf(b, (i / 4) * Math.PI * 2 + rand(), 0.09 + rand() * 0.06);
  const count = kind === "bell" ? 2 : 3;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.8;
    const lean = 0.03 + rand() * 0.07;
    const top = V(Math.cos(a) * lean, 0.2 + rand() * 0.16, Math.sin(a) * lean);
    stem(b, top, 0.006);
    if (kind === "daisy") {
      corolla(b, top, 11, 0.032, 0.009, 0.05, [0.92, 0.9, 0.84], [1, 1, 0.98], rand() * 3);
      disc(b, top, 0.011, [0.95, 0.7, 0.12], [0.85, 0.6, 0.1]);
    } else if (kind === "buttercup") {
      corolla(b, top, 5, 0.02, 0.016, 0.55, [0.95, 0.68, 0.05], [1, 0.86, 0.2], rand() * 3);
      disc(b, top, 0.006, [0.75, 0.6, 0.12], [0.85, 0.7, 0.15]);
    } else {
      for (let k = 0; k < 3; k++) {
        const t = 0.62 + k * 0.17;
        const p = V(top.x * t * t, top.y * t, top.z * t * t).add(V(Math.cos(a + k * 2.1) * 0.02, -0.01, Math.sin(a + k * 2.1) * 0.02));
        bell(b, p, 0.014, 0.03, [0.55, 0.42, 0.85], [0.32, 0.22, 0.55]);
      }
    }
  }
  return b.build();
}
