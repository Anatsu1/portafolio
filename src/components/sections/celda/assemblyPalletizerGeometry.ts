import * as THREE from "three";
import { chamferRect, lathe, mat, merge, part, robotMaterials, slab, type PartOptions } from "./robotMetal";

/*
 * Geometría procedural de la estación de paletizado: el brazo paletizador, el
 * autoelevador, el pallet de madera y el gabinete de control. Mismo acero,
 * franjas y cables que el brazo del laboratorio (robotMetal), así toda la
 * escena comparte la estética. Funciones puras: devuelven Groups con UNA malla
 * por material (piezas fusionadas), sin React.
 *
 * BRAZO (unidades de la escena, origen en el piso al pie del brazo):
 *   pedestal fijo        0 … 0,50   placa abulonada + columna con bridas
 *   torreta (gira en Y)  0,50 … 0,90 plato con franjas, horquilla y motor J2
 *   brazo (gira en Z)    eje del hombro a 0,90; largo ARM_L1 hacia +X
 *   antebrazo (Z)        eje del codo; largo ARM_L2 hacia +X, contrapeso atrás
 *   muñeca               queda siempre horizontal (la compensa la animación)
 *   herramienta (gira Y) ventosas: la cara de contacto está a TOOL_L bajo la muñeca
 */

export const ARM_H0 = 0.9;
export const ARM_L1 = 1.2;
export const ARM_L2 = 1.3;
export const TOOL_L = 0.42;
const TURRET_Y = 0.5;

const STEEL = "#4d5256";
const STEEL_DARK = "#3c4044";
const MACHINED = "#6f7478";
const BOLT = "#a3a8ac";

type Parts = { steel: THREE.BufferGeometry[]; hazard: THREE.BufferGeometry[]; label: THREE.BufferGeometry[]; cable: THREE.BufferGeometry[] };
const newParts = (): Parts => ({ steel: [], hazard: [], label: [], cable: [] });

function toGroup(p: Parts, name: string, extra: Record<string, THREE.BufferGeometry[]> = {}, extraMats: Record<string, THREE.Material> = {}) {
  const m = robotMaterials();
  const group = new THREE.Group();
  group.name = name;
  (Object.keys(p) as (keyof Parts)[]).forEach((k) => {
    if (p[k].length) group.add(Object.assign(new THREE.Mesh(merge(p[k]), m[k]), { name: `${name}-${k}` }));
  });
  for (const [k, list] of Object.entries(extra)) {
    if (list.length) group.add(Object.assign(new THREE.Mesh(merge(list), extraMats[k]), { name: `${name}-${k}` }));
  }
  return group;
}

/**
 * `lathe` saca la normal del sentido del perfil: tiene que recorrerse en sentido
 * antihorario en el plano (radio, y) — abajo hacia afuera, el costado hacia
 * arriba, arriba hacia adentro. Los perfiles que se leen mejor al revés pasan por acá.
 */
const inward = (p: [number, number][]) => [...p].reverse();

function bolt(list: THREE.BufferGeometry[], m: THREE.Matrix4, s = 1) {
  list.push(part(lathe([[0.03 * s, 0], [0.03 * s, 0.006 * s], [0.026 * s, 0.009 * s], [0, 0.009 * s]], 10), m, { tint: BOLT, capAxis: "y", edge: 0 }));
  list.push(part(lathe([[0.022 * s, 0.009 * s], [0.022 * s, 0.022 * s], [0.016 * s, 0.03 * s], [0, 0.03 * s]], 6, true), m, { tint: BOLT, capAxis: "y", edge: 0 }));
}

/** Círculo de tornillos sobre un plano normal a +Y (o al eje que indique `base`). */
function boltCircle(list: THREE.BufferGeometry[], base: THREE.Matrix4, r: number, n: number, s: number, phase = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = ((i + phase) / n) * Math.PI * 2;
    bolt(list, base.clone().multiply(mat(Math.cos(a) * r, 0, Math.sin(a) * r, 0, -a)), s);
  }
}

/** Cuerpo de motor (torno) a lo largo de +Y desde el origen de `m`. */
function motor(list: THREE.BufferGeometry[], m: THREE.Matrix4, r: number, len: number) {
  const prof: [number, number][] = [[0, 0], [r * 0.9, 0], [r, r * 0.1]];
  const fins = 5;
  for (let k = 0; k < fins; k++) {
    const y = len * 0.18 + (k * len * 0.6) / fins;
    prof.push([r, y], [r * 1.1, y + 0.004], [r * 1.1, y + len * 0.06], [r, y + len * 0.07]);
  }
  prof.push([r, len * 0.9], [r * 0.92, len], [r * 0.4, len], [r * 0.35, len * 1.05], [0, len * 1.05]);
  list.push(part(lathe(prof, 24), m, { tint: STEEL_DARK, capAxis: "y", edge: 0 }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    bolt(list, m.clone().multiply(mat(Math.cos(a) * r * 0.66, len, Math.sin(a) * r * 0.66)), 0.45);
  }
}

/** Cable trenzado por una lista de puntos. */
function cable(list: THREE.BufferGeometry[], pts: [number, number, number][], r: number, m = mat()) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  list.push(part(new THREE.TubeGeometry(curve, Math.max(12, pts.length * 8), r, 8), m, { uv: "keep", uvScale: [curve.getLength() / 0.05, 1], edge: 0 }));
}

// ------------------------------------------------------------------- brazo --

export function buildPalBase() {
  const p = newParts();
  // Placa base con orejas y bulones de anclaje.
  p.steel.push(part(slab(chamferRect(0.45, 0.45, 0.1), 0.06, 0.012), mat(0, 0, 0, -Math.PI / 2), { tint: STEEL_DARK }));
  for (const [x, z] of [[0.36, 0.36], [-0.36, 0.36], [0.36, -0.36], [-0.36, -0.36], [0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]] as const) {
    p.steel.push(part(lathe([[0.04, 0], [0.04, 0.012], [0.032, 0.016], [0, 0.016]], 12), mat(x, 0.06, z), { tint: BOLT, capAxis: "y", edge: 0 }));
    p.steel.push(part(lathe([[0.03, 0.016], [0.03, 0.038], [0.024, 0.044], [0, 0.044]], 6, true), mat(x, 0.06, z), { tint: BOLT, capAxis: "y", edge: 0 }));
  }
  // Columna con bridas (gira la torreta encima).
  p.steel.push(
    part(
      lathe([[0, 0.06], [0.34, 0.06], [0.34, 0.085], [0.3, 0.1], [0.27, 0.1], [0.255, 0.16], [0.255, 0.36], [0.27, 0.4], [0.33, 0.4], [0.33, 0.44], [0.31, 0.46], [0.31, TURRET_Y]], 48),
      mat(),
      { tint: STEEL, capAxis: "y" },
    ),
  );
  boltCircle(p.steel, mat(0, 0.1, 0), 0.31, 12, 0.5);
  boltCircle(p.steel, mat(0, 0.44, 0), 0.3, 12, 0.5);
  // Franja de peligro en la cintura y placa de advertencia.
  p.hazard.push(part(lathe([[0.258, 0.22], [0.258, 0.3]], 48), mat(), { uv: "keep", uvScale: [6, 1 / 0.25], capAxis: "y", edge: 0 }));
  p.label.push(part(new THREE.PlaneGeometry(0.2, 0.075), mat(0, 0.33, 0.262), { uv: "keep", edge: 0 }));
  // Caja de conexiones y cable que baja a la placa (y sigue al gabinete).
  p.steel.push(part(slab(chamferRect(0.07, 0.06, 0.012), 0.09, 0.008), mat(-0.255, 0.2, 0, 0, -Math.PI / 2), { tint: STEEL_DARK }));
  cable(p.cable, [[-0.31, 0.17, 0.02], [-0.36, 0.1, 0.03], [-0.42, 0.075, 0.05], [-0.6, 0.075, 0.08], [-0.9, 0.02, 0.12]], 0.022);
  cable(p.cable, [[-0.31, 0.17, -0.03], [-0.37, 0.09, -0.04], [-0.43, 0.075, -0.02], [-0.6, 0.075, 0.03], [-0.9, 0.02, 0.06]], 0.016);
  return toGroup(p, "pal-base");
}

/** Torreta: va dentro del grupo de yaw, con origen en y = TURRET_Y. */
export function buildPalTurret() {
  const p = newParts();
  const axis = ARM_H0 - TURRET_Y;
  p.steel.push(part(lathe([[0, 0], [0.32, 0], [0.34, 0.01]], 48), mat(), { tint: STEEL, capAxis: "y" }));
  p.hazard.push(part(lathe([[0.34, 0.01], [0.34, 0.045]], 48), mat(), { uv: "keep", uvScale: [10, 1 / 0.2], capAxis: "y", edge: 0 }));
  p.steel.push(part(lathe(inward([[0, 0.06], [0.33, 0.06], [0.34, 0.045]]), 48), mat(), { tint: STEEL, capAxis: "y" }));
  boltCircle(p.steel, mat(0, 0.06, 0), 0.28, 10, 0.45);
  // Horquilla: dos mejillas con arco alrededor del eje del hombro.
  const cheek = new THREE.Shape();
  cheek.moveTo(-0.22, 0.06);
  cheek.lineTo(0.2, 0.06);
  cheek.lineTo(0.17, axis);
  cheek.absarc(0, axis, 0.17, 0, Math.PI, false);
  cheek.lineTo(-0.22, 0.06);
  for (const z of [0.13, -0.2]) p.steel.push(part(slab(cheek, 0.07, 0.01, 20), mat(0, 0, z), { tint: STEEL }));
  // Motor del hombro (+Z) y maza (−Z).
  motor(p.steel, mat(0, axis, 0.2, Math.PI / 2), 0.1, 0.2);
  p.steel.push(part(lathe([[0.1, 0], [0.1, 0.02], [0.085, 0.03], [0.04, 0.03], [0.04, 0.045], [0, 0.045]], 28), mat(0, axis, -0.2, -Math.PI / 2), { tint: STEEL, capAxis: "y", edge: 0 }));
  // Contrapeso / caja trasera con franjas.
  p.hazard.push(part(slab(chamferRect(0.09, 0.1, 0.02), 0.26, 0.01), mat(-0.25, 0.2, -0.13), { uvScale: [1.4, 1.4] }));
  cable(p.cable, [[-0.12, axis - 0.08, 0.3], [-0.2, 0.15, 0.3], [-0.3, 0.08, 0.2], [-0.33, 0.07, 0.0]], 0.016);
  return toGroup(p, "pal-turret");
}

/** Brazo: desde el eje del hombro (origen) hacia +X, eje del codo en x = ARM_L1. */
export function buildPalUpperArm() {
  const p = newParts();
  const hub = (x: number, r: number, w: number) => {
    p.steel.push(part(lathe([[0, -w], [r - 0.02, -w], [r, -w + 0.02], [r, w - 0.02], [r - 0.02, w], [0, w]], 32), mat(x, 0, 0, Math.PI / 2), { tint: STEEL, capAxis: "y" }));
    boltCircle(p.steel, mat(x, 0, w, Math.PI / 2), r * 0.7, 8, 0.4);
  };
  hub(0, 0.15, 0.12);
  hub(ARM_L1, 0.12, 0.1);
  // Viga cajón ahusada: sección 0,2 × 0,22 en el hombro, 0,16 × 0,16 en el codo.
  const beam = slab(chamferRect(0.11, ARM_L1 / 2 - 0.05, 0.03), 0.2, 0.012);
  const warp = (v: THREE.Vector3) => {
    const t = THREE.MathUtils.clamp(v.x / ARM_L1, 0, 1);
    v.y *= 1 - 0.3 * t;
    v.z *= 1 - 0.2 * t;
  };
  p.steel.push(part(beam, mat(ARM_L1 / 2, 0, -0.1, 0, 0, -Math.PI / 2), { tint: STEEL, warp }));
  // Placa con franjas en el flanco que ve la cámara (+Z) y en el otro.
  for (const z of [0.102, -0.112]) p.hazard.push(part(slab(chamferRect(0.25, 0.06, 0.02), 0.01, 0.003), mat(ARM_L1 * 0.42, 0, z), { uvScale: [1.6, 1.6] }));
  for (const x of [ARM_L1 * 0.22, ARM_L1 * 0.62]) {
    for (const y of [0.075, -0.075]) bolt(p.steel, mat(x, y * 0.9, 0.1, Math.PI / 2), 0.4);
  }
  // Conducto de cables sobre el lomo, con abrazaderas.
  cable(p.cable, [[0.05, 0.16, 0.06], [0.3, 0.135, 0.07], [0.7, 0.12, 0.07], [1.05, 0.12, 0.06], [1.15, 0.15, 0.04]], 0.022);
  for (const x of [0.32, 0.72]) p.steel.push(part(slab(chamferRect(0.02, 0.035, 0.008), 0.06, 0.004), mat(x, 0.115, 0.04, Math.PI / 2), { tint: MACHINED }));
  return toGroup(p, "pal-upper");
}

/** Antebrazo: desde el eje del codo hacia +X, muñeca en x = ARM_L2; contrapeso hacia −X. */
export function buildPalForearm() {
  const p = newParts();
  p.steel.push(part(lathe([[0, -0.085], [0.11, -0.085], [0.125, -0.07], [0.125, 0.07], [0.11, 0.085], [0, 0.085]], 28), mat(0, 0, 0, Math.PI / 2), { tint: STEEL, capAxis: "y" }));
  motor(p.steel, mat(0, 0, 0.085, Math.PI / 2), 0.075, 0.15);
  const beam = slab(chamferRect(0.07, ARM_L2 / 2, 0.022), 0.13, 0.01);
  const warp = (v: THREE.Vector3) => {
    const t = THREE.MathUtils.clamp(v.x / ARM_L2, 0, 1);
    v.y *= 1 - 0.25 * t;
  };
  p.steel.push(part(beam, mat(ARM_L2 / 2, 0, -0.065, 0, 0, -Math.PI / 2), { tint: STEEL, warp }));
  // Contrapeso trasero.
  p.hazard.push(part(slab(chamferRect(0.13, 0.1, 0.03), 0.17, 0.012), mat(-0.2, 0, -0.085), { uvScale: [1.5, 1.5] }));
  p.steel.push(part(lathe([[0, -0.07], [0.07, -0.07], [0.08, -0.06], [0.08, 0.06], [0.07, 0.07], [0, 0.07]], 24), mat(ARM_L2, 0, 0, Math.PI / 2), { tint: MACHINED, capAxis: "y" }));
  cable(p.cable, [[0.05, 0.1, 0.05], [0.4, 0.085, 0.06], [0.9, 0.07, 0.055], [1.24, 0.07, 0.04]], 0.017);
  return toGroup(p, "pal-forearm");
}

/** Muñeca (siempre horizontal) + brida. La herramienta cuelga de ahí y gira en Y. */
export function buildPalWrist() {
  const p = newParts();
  p.steel.push(part(lathe(inward([[0.065, -0.02], [0.065, -0.11], [0.08, -0.12], [0.08, -0.14], [0, -0.14]]), 24), mat(), { tint: STEEL_DARK, capAxis: "y" }));
  return toGroup(p, "pal-wrist");
}

/** Ventosa: un fuelle de goma. Las ventosas son un grupo propio para "aplastarlas" al agarrar. */
export function buildPalTool() {
  const p = newParts();
  const steel: PartOptions = { tint: STEEL };
  p.steel.push(part(lathe(inward([[0.075, -0.14], [0.075, -0.16], [0.06, -0.17], [0.06, -0.24], [0, -0.24]]), 24), mat(), { tint: MACHINED, capAxis: "y", wear: 2 }));
  // Bastidor de la herramienta: placa con largueros.
  p.steel.push(part(slab(chamferRect(0.24, 0.17, 0.03), 0.035, 0.008), mat(0, -0.275, 0, -Math.PI / 2), steel));
  for (const z of [-0.15, 0.15]) p.hazard.push(part(new THREE.BoxGeometry(0.5, 0.05, 0.02), mat(0, -0.21, z), { uvScale: [1.5, 1.5], edge: 0.01 }));
  for (const [x, z] of [[-0.19, -0.12], [0.19, -0.12], [-0.19, 0.12], [0.19, 0.12]] as const) bolt(p.steel, mat(x, -0.24, z), 0.4);
  // Generador de vacío y mangueras a las ventosas.
  p.steel.push(part(slab(chamferRect(0.06, 0.035, 0.01), 0.06, 0.006), mat(0, -0.22, -0.03), { tint: STEEL_DARK }));
  for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]] as const) {
    cable(p.cable, [[x * 0.3, -0.2, z * 0.3], [x * 0.7, -0.19, z * 0.8], [x, -0.24, z]], 0.008);
  }
  const tool = toGroup(p, "pal-tool");
  // Ventosas (goma negra) en su propio grupo.
  const cups: THREE.BufferGeometry[] = [];
  for (const [x, z] of [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.1], [0.14, 0.1]] as const) {
    cups.push(part(lathe(inward([[0.018, 0], [0.022, -0.02], [0.03, -0.035], [0.05, -0.06], [0.052, -0.065], [0, -0.065]]), 16), mat(x, 0, z), { tint: "#2a2a2a", capAxis: "y", edge: 0 }));
  }
  const cupMesh = new THREE.Mesh(merge(cups), robotMaterials().cable);
  cupMesh.name = "pal-cups";
  cupMesh.position.y = -0.293;
  return { tool, cups: cupMesh };
}

// -------------------------------------------------------------- gabinete --

export function buildCabinet() {
  const p = newParts();
  p.steel.push(part(slab(chamferRect(0.32, 0.22, 0.02), 1.3, 0.012), mat(0, 0.1, 0, -Math.PI / 2), { tint: STEEL }));
  p.steel.push(part(new THREE.BoxGeometry(0.6, 0.1, 0.4), mat(0, 0.05, 0), { tint: "#202326", edge: 0 }));
  // Puerta: marco, bisagras, manija, rejilla y placa de advertencia.
  p.steel.push(part(slab(chamferRect(0.28, 0.58, 0.01), 0.012, 0.004), mat(0, 0.75, 0.22), { tint: STEEL_DARK }));
  for (const y of [0.3, 1.2]) p.steel.push(part(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), mat(-0.29, y, 0.235), { tint: MACHINED, edge: 0 }));
  p.steel.push(part(new THREE.BoxGeometry(0.03, 0.14, 0.03), mat(0.22, 0.8, 0.245), { tint: MACHINED, edge: 0, wear: 2 }));
  for (let k = 0; k < 6; k++) p.steel.push(part(new THREE.BoxGeometry(0.3, 0.012, 0.012), mat(0, 0.3 + k * 0.035, 0.236), { tint: "#202326", edge: 0 }));
  p.label.push(part(new THREE.PlaneGeometry(0.3, 0.11), mat(0, 1.05, 0.2345), { uv: "keep", edge: 0 }));
  // Prensacables y cable al brazo.
  cable(p.cable, [[0.15, 0.06, 0.0], [0.4, 0.04, 0.05], [0.8, 0.03, 0.2], [1.1, 0.03, 0.4]], 0.02);
  return toGroup(p, "pal-cabinet");
}

// ------------------------------------------------------------------ pallet --

/** Pallet de madera de 1 × 1 × 0,144 (origen en el centro del piso del pallet). */
export function buildPalletGeometry() {
  const boards: THREE.BufferGeometry[] = [];
  const rand = (i: number) => Math.sin(i * 12.9898) * 0.5 + 0.5;
  const tint = (i: number) => new THREE.Color("#8a6a45").multiplyScalar(0.8 + rand(i) * 0.35).getStyle();
  let i = 0;
  // tablas de abajo, tacos y tablas de arriba
  for (const z of [-0.43, 0, 0.43]) boards.push(part(new THREE.BoxGeometry(1, 0.022, 0.12), mat(0, 0.011, z), { tint: tint(i++), edge: 0.01, uvScale: [1.2, 1.2] }));
  for (const x of [-0.43, 0, 0.43]) for (const z of [-0.43, 0, 0.43]) boards.push(part(new THREE.BoxGeometry(0.12, 0.078, 0.12), mat(x, 0.061, z), { tint: tint(i++), edge: 0.01 }));
  for (const x of [-0.43, 0, 0.43]) boards.push(part(new THREE.BoxGeometry(0.12, 0.022, 1), mat(x, 0.111, 0), { tint: tint(i++), edge: 0.01 }));
  for (const z of [-0.44, -0.22, 0, 0.22, 0.44]) boards.push(part(new THREE.BoxGeometry(1, 0.022, 0.1), mat(0, 0.133, z), { tint: tint(i++), edge: 0.01, uvScale: [1.2, 1.2] }));
  return merge(boards);
}

// ------------------------------------------------------------ autoelevador --

/*
 * Autoelevador (unidades de la escena). Origen: talón de las uñas, en el piso;
 * avanza hacia +X (las uñas van adelante). Cabina y contrapeso hacia −X.
 * Devuelve el chasis, el carro (sube con la carga) y los dos ejes de ruedas.
 */
export function buildForklift(paint: THREE.Material, rubber: THREE.Material, light: THREE.Material) {
  const body = newParts();
  const yellow: THREE.BufferGeometry[] = [];
  const glow: THREE.BufferGeometry[] = [];
  const Y = "#c8940e";
  // Chasis: bajo, con el contrapeso redondeado atrás.
  yellow.push(part(slab(chamferRect(0.82, 0.5, 0.08), 0.42, 0.03), mat(-1.0, 0.16, 0, -Math.PI / 2), { tint: Y }));
  yellow.push(part(slab(chamferRect(0.55, 0.5, 0.06), 0.1, 0.02), mat(-1.0, 0.58, 0, -Math.PI / 2), { tint: Y }));
  body.hazard.push(part(slab(chamferRect(0.22, 0.52, 0.12), 0.5, 0.025), mat(-1.82, 0.15, 0, -Math.PI / 2), { uvScale: [1.6, 1.6] }));
  // Guardabarros sobre las ruedas delanteras.
  for (const z of [-0.5, 0.5]) yellow.push(part(slab(chamferRect(0.26, 0.04, 0.03), 0.2, 0.01), mat(-0.35, 0.47, z - 0.1, 0, 0, 0), { tint: Y }));
  // Asiento y volante.
  body.steel.push(part(slab(chamferRect(0.2, 0.2, 0.04), 0.08, 0.02), mat(-1.25, 0.68, 0, -Math.PI / 2), { tint: "#25282a" }));
  body.steel.push(part(slab(chamferRect(0.04, 0.2, 0.03), 0.38, 0.015), mat(-1.43, 0.72, 0, 0, Math.PI / 2, -0.15), { tint: "#25282a" }));
  body.steel.push(part(new THREE.CylinderGeometry(0.03, 0.035, 0.45, 8), mat(-0.72, 0.85, 0, 0, 0, 0.5), { tint: STEEL_DARK, edge: 0 }));
  body.steel.push(part(new THREE.TorusGeometry(0.13, 0.016, 6, 20), mat(-0.82, 1.06, 0, 0, Math.PI / 2, 0.5 + Math.PI / 2), { tint: "#202020", edge: 0 }));
  // Techo protector: cuatro parantes y parrilla.
  for (const [x, z] of [[-0.55, 0.45], [-0.55, -0.45], [-1.6, 0.45], [-1.6, -0.45]] as const) {
    body.steel.push(part(new THREE.BoxGeometry(0.06, 1.45, 0.06), mat(x, 0.66 + 0.72, z, 0, 0, x > -1 ? -0.08 : 0), { tint: STEEL_DARK, edge: 0.01 }));
  }
  body.steel.push(part(slab(chamferRect(0.58, 0.5, 0.04), 0.05, 0.012), mat(-1.08, 2.08, 0, -Math.PI / 2), { tint: STEEL_DARK }));
  for (let k = 0; k < 6; k++) yellow.push(part(new THREE.BoxGeometry(0.02, 0.035, 0.9), mat(-1.55 + k * 0.19, 2.15, 0), { tint: Y, edge: 0 }));
  // Baliza sobre el techo y faros.
  glow.push(part(lathe([[0.05, 0], [0.05, 0.08], [0.03, 0.1], [0, 0.1]], 12), mat(-1.5, 2.13, 0.35), { tint: "#ffffff", capAxis: "y", edge: 0 }));
  for (const z of [-0.36, 0.36]) {
    body.steel.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), mat(-0.58, 2.0, z, 0, 0, Math.PI / 2), { tint: STEEL_DARK, edge: 0 }));
    glow.push(part(new THREE.CircleGeometry(0.04, 12), mat(-0.548, 2.0, z, 0, Math.PI / 2), { tint: "#fff3d6", edge: 0, uv: "keep" }));
  }
  // Mástil: dos montantes en C, cilindro de elevación y cadenas.
  for (const z of [-0.32, 0.32]) body.steel.push(part(new THREE.BoxGeometry(0.08, 2.0, 0.07), mat(-0.12, 1.02, z), { tint: STEEL_DARK, edge: 0.02 }));
  body.steel.push(part(new THREE.BoxGeometry(0.08, 0.08, 0.72), mat(-0.12, 1.98, 0), { tint: STEEL_DARK, edge: 0.02 }));
  body.steel.push(part(new THREE.CylinderGeometry(0.045, 0.045, 1.5, 12), mat(-0.2, 0.85, 0), { tint: MACHINED, edge: 0, wear: 2 }));
  body.hazard.push(part(new THREE.BoxGeometry(0.06, 0.3, 0.64), mat(-0.12, 2.12, 0), { uvScale: [1.6, 1.6], edge: 0.01 }));
  const chassis = toGroup(body, "fork-body", { paint: yellow, glow }, { paint, glow: light });

  // Carro portahorquillas (sube con `lift`).
  const car = newParts();
  car.steel.push(part(new THREE.BoxGeometry(0.06, 0.5, 0.78), mat(-0.04, 0.3, 0), { tint: STEEL, edge: 0.01 }));
  for (let k = 0; k < 4; k++) car.steel.push(part(new THREE.BoxGeometry(0.03, 0.55, 0.03), mat(-0.04, 0.82, -0.3 + k * 0.2), { tint: STEEL_DARK, edge: 0 }));
  car.steel.push(part(new THREE.BoxGeometry(0.03, 0.03, 0.78), mat(-0.04, 1.08, 0), { tint: STEEL_DARK, edge: 0 }));
  for (const z of [-0.25, 0.25]) {
    car.steel.push(part(new THREE.BoxGeometry(1.05, 0.04, 0.1), mat(0.5, 0.045, z), { tint: STEEL_DARK, edge: 0.012 }));
    car.steel.push(part(new THREE.BoxGeometry(0.04, 0.45, 0.1), mat(0.0, 0.27, z), { tint: STEEL_DARK, edge: 0.012 }));
  }
  const carriage = toGroup(car, "fork-carriage");

  // Ejes de ruedas (cada uno gira entero).
  const axle = (r: number, z: number, w: number) => {
    const list: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      list.push(part(lathe([[0, -w / 2], [r * 0.9, -w / 2], [r, -w / 2 + 0.02], [r, w / 2 - 0.02], [r * 0.9, w / 2], [0, w / 2]], 20), mat(0, 0, s * z, Math.PI / 2), { tint: "#ffffff", capAxis: "y", edge: 0 }));
      list.push(part(lathe([[0, -w / 2 - 0.005], [r * 0.55, -w / 2 - 0.005]], 12), mat(0, 0, s * z, Math.PI / 2), { tint: "#9a8a3a", capAxis: "y", edge: 0 }));
    }
    const mesh = new THREE.Mesh(merge(list), rubber);
    mesh.position.y = r;
    return mesh;
  };
  const front = axle(0.23, 0.47, 0.18);
  front.position.x = -0.35;
  const rear = axle(0.19, 0.42, 0.15);
  rear.position.x = -1.55;
  return { chassis, carriage, front, rear };
}

