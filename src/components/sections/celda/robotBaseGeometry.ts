import * as THREE from "three";
import { chamferRect, lathe, mat, merge, octagon, part, robotMaterials, slab, type PartOptions } from "./robotMetal";

/*
 * Pedestal y torreta del brazo, armados en código (reemplazan al base.glb de
 * Meshy, cuyas caras salían onduladas). Funciones puras de three.js: devuelven
 * un Group con una malla por material, sin React, para poder probarlas solas.
 *
 * PEDESTAL (unidades del modelo, escala 1, origen al centro como el .glb viejo:
 * 1,9 × 1,5 × 1,9; piso en y = −0,75, plano de apoyo superior en y = +0,75):
 *   y −0,75…−0,67  placa base 1,9 × 1,9 con esquinas achaflanadas (orejas) y
 *                  12 bulones de anclaje con tuerca
 *   y −0,67…−0,61  zócalo 1,48 × 1,48
 *   y −0,61…+0,42  torre octogonal troncopiramidal (apotema 0,62 → 0,46), con
 *                  4 paneles atornillados (el de +Z: tapa de inspección con la
 *                  placa CAUTION) y 4 escuadras con franjas en las diagonales
 *   y +0,42…+0,66  collar del rodamiento (brida, alojamiento, brida abulonada)
 *   y +0,66…+0,75  corona dentada (90 dientes, r 0,562…0,585)
 *   +X             motorreductor: caja de engranajes contra el collar, motor
 *                  aletado con tapa redonda hacia +Z, bornera y dos cables
 *                  trenzados que bajan a prensacables en la placa
 *
 * TORRETA (unidades de la escena; origen sobre el plano superior del pedestal
 * ya escalado, eje del hombro en (0; 0,25; 0) a lo largo de Z, brazo hacia +X):
 *   y 0…0,046      plato r 0,42 con franja de seguridad en el canto
 *   mejillas       horquilla en z ∈ ±[0,18; 0,26]: dejan 0,037 de luz al disco
 *                  del segmento (r 0,21, z ±0,143), arco r 0,235 alrededor del eje
 *   −X             travesaño trasero (x −0,335…−0,245, fuera del giro del disco)
 *   +Z / −Z        servo del hombro con tapa abulonada / maza con tuerca del eje
 */

// Tintes (sRGB) que multiplican el grunge (~0,8): gunmetal como los segmentos.
const STEEL = "#4d5256";
const STEEL_DARK = "#3c4044";
const MACHINED = "#6f7478";
const BOLT = "#a3a8ac";
const RUBBER = "#ffffff";

type Parts = { steel: THREE.BufferGeometry[]; hazard: THREE.BufferGeometry[]; label: THREE.BufferGeometry[]; cable: THREE.BufferGeometry[] };

const newParts = (): Parts => ({ steel: [], hazard: [], label: [], cable: [] });

function toGroup(parts: Parts, name: string) {
  const m = robotMaterials();
  const group = new THREE.Group();
  group.name = name;
  (Object.keys(parts) as (keyof Parts)[]).forEach((key) => {
    if (!parts[key].length) return;
    const mesh = new THREE.Mesh(merge(parts[key]), m[key]);
    mesh.name = `${name}-${key}`;
    group.add(mesh);
  });
  return group;
}

// ------------------------------------------------------------- tornillería --

/** Tornillo de cabeza hexagonal con arandela, a lo largo de +Y desde el origen. */
function boltGeometries(s: number) {
  const washer = lathe([[0.03 * s, 0], [0.03 * s, 0.006 * s], [0.026 * s, 0.009 * s], [0, 0.009 * s]], 12);
  const head = lathe([[0.022 * s, 0.009 * s], [0.022 * s, 0.022 * s], [0.016 * s, 0.03 * s], [0, 0.03 * s]], 6, true);
  return [washer, head];
}

/** Agrega un tornillo; `m` lo ubica con su eje +Y saliendo de la superficie. */
function bolt(list: THREE.BufferGeometry[], m: THREE.Matrix4, s = 1) {
  for (const g of boltGeometries(s)) list.push(part(g, m, { tint: BOLT, capAxis: "y", edge: 0 }));
}

/** Bulón de anclaje: arandela gruesa, tuerca y punta de varilla roscada. */
function anchor(list: THREE.BufferGeometry[], x: number, y: number, z: number) {
  const m = mat(x, y, z);
  list.push(part(lathe([[0.055, 0], [0.055, 0.01], [0.05, 0.014], [0, 0.014]], 16), m, { tint: BOLT, capAxis: "y", edge: 0 }));
  list.push(part(lathe([[0.042, 0.014], [0.042, 0.04], [0.034, 0.048], [0, 0.048]], 6, true), m, { tint: BOLT, capAxis: "y", edge: 0 }));
  list.push(part(lathe([[0.019, 0.048], [0.019, 0.07], [0.014, 0.076], [0, 0.076]], 10), m, { tint: MACHINED, capAxis: "y", edge: 0, wear: 2 }));
}

// ------------------------------------------------------------------ pedestal --

const FLOOR = -0.75;
const TOWER_Y0 = -0.61;
const TOWER_H = 1.03;
const TOWER_A0 = 0.62; // apotema abajo
const TOWER_A1 = 0.46; // apotema arriba
const SLOPE = Math.atan((TOWER_A0 - TOWER_A1) / TOWER_H);

/** Apotema de la torre a la altura y. */
function apothem(y: number) {
  const t = THREE.MathUtils.clamp((y - TOWER_Y0) / TOWER_H, 0, 1);
  return TOWER_A0 + (TOWER_A1 - TOWER_A0) * t;
}

/** Matriz de un punto sobre una cara de la torre (0 = +Z, en sentido de ry), inclinada como la cara. */
function onFace(face: number, y: number, x = 0, out = 0) {
  return new THREE.Matrix4()
    .makeRotationY((face * Math.PI) / 2)
    .multiply(mat(x, y, apothem(y) + out, -SLOPE));
}

/** Panel atornillado (y la tapa de inspección si `cover`) sobre una cara de la torre. */
function towerPanel(p: Parts, face: number, cover: boolean) {
  const yc = -0.13;
  const base = onFace(face, yc);
  const T = 0.022;
  p.steel.push(part(slab(chamferRect(0.15, 0.27, 0.035), T, 0.007), base, { tint: STEEL }));
  const corners: [number, number][] = [[-0.115, -0.235], [0.115, -0.235], [-0.115, 0.235], [0.115, 0.235]];
  if (cover) corners.push([-0.122, 0], [0.122, 0]);
  for (const [x, y] of corners) {
    bolt(p.steel, base.clone().multiply(mat(x, y, T, Math.PI / 2)), 0.75);
  }
  if (!cover) {
    // Rejilla de ventilación: tres lamas biseladas.
    for (const y of [-0.06, 0, 0.06]) {
      p.steel.push(part(slab(chamferRect(0.085, 0.012, 0.006), 0.014, 0.005), base.clone().multiply(mat(0, y - 0.05, T)), { tint: STEEL_DARK }));
    }
    return;
  }
  // Placa CAUTION (plano con textura) y manija.
  const plate = new THREE.PlaneGeometry(0.24, 0.09);
  p.label.push(part(plate, base.clone().multiply(mat(0, 0.1, T + 0.002)), { uv: "keep", edge: 0 }));
  p.steel.push(part(slab(chamferRect(0.13, 0.054, 0.012), 0.004, 0.002), base.clone().multiply(mat(0, 0.1, T - 0.002)), { tint: STEEL_DARK }));
  const handle = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.065, 0, 0),
    new THREE.Vector3(-0.06, 0, 0.03),
    new THREE.Vector3(0, 0, 0.036),
    new THREE.Vector3(0.06, 0, 0.03),
    new THREE.Vector3(0.065, 0, 0),
  ]);
  p.steel.push(part(new THREE.TubeGeometry(handle, 16, 0.009, 8), base.clone().multiply(mat(0, -0.11, T)), { tint: MACHINED, edge: 0, wear: 2 }));
  for (const x of [-0.065, 0.065]) {
    p.steel.push(part(slab(chamferRect(0.016, 0.022, 0.006), 0.01, 0.003), base.clone().multiply(mat(x, -0.11, T - 0.002)), { tint: STEEL }));
  }
}

/** Escuadra soldada en una diagonal de la torre (franjas de seguridad). */
function gusset(p: Parts, k: number) {
  const phi = Math.PI / 4 + (k * Math.PI) / 2;
  const s = new THREE.Shape();
  const top = 0.62;
  s.moveTo(0.57, 0);
  s.lineTo(0.9, 0);
  s.lineTo(0.9, 0.06);
  s.lineTo(apothem(TOWER_Y0 + top) + 0.035, top);
  s.lineTo(apothem(TOWER_Y0 + top) - 0.04, top);
  s.closePath();
  const m = mat(0, TOWER_Y0, 0, 0, phi - Math.PI / 2).multiply(mat(0, 0, -0.025));
  p.hazard.push(part(slab(s, 0.05, 0.008), m, { uvScale: [1.6, 1.6] }));
}

/** Corona dentada (contorno con dientes trapezoidales y agujero central). */
function gearShape(teeth: number, root: number, tip: number, hole: number) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const t = i * step;
    const pts: [number, number][] = [
      [root, t - step * 0.3],
      [tip, t - step * 0.17],
      [tip, t + step * 0.17],
      [root, t + step * 0.3],
    ];
    pts.forEach(([r, a], j) => {
      if (i === 0 && j === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    });
  }
  s.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

function collar(p: Parts) {
  const opt: PartOptions = { tint: STEEL, capAxis: "y" };
  // Brida de asiento sobre la torre.
  p.steel.push(part(lathe([[0.6, 0.42], [0.6, 0.462], [0.582, 0.48], [0.5, 0.48]], 64), mat(), opt));
  // Alojamiento del rodamiento con un cordón y la brida abulonada.
  p.steel.push(
    part(
      lathe(
        [
          [0.55, 0.48], [0.55, 0.532], [0.562, 0.538], [0.562, 0.556], [0.55, 0.562], [0.55, 0.615],
          [0.64, 0.615], [0.64, 0.648], [0.626, 0.66], [0.57, 0.66],
        ],
        64,
      ),
      mat(),
      opt,
    ),
  );
  for (let i = 0; i < 24; i++) {
    const a = ((i + 0.5) / 24) * Math.PI * 2;
    bolt(p.steel, mat(Math.cos(a) * 0.607, 0.66, Math.sin(a) * 0.607, 0, -a), 0.55);
  }
  // Corona: dentado fino, mecanizado (brillo parejo).
  p.steel.push(part(slab(gearShape(90, 0.562, 0.585, 0.36), 0.09, 0, 24), mat(0, 0.66, 0, -Math.PI / 2), { tint: MACHINED, wear: 2 }));
}

function gearMotor(p: Parts) {
  // Caja de engranajes contra el collar.
  p.steel.push(part(slab(chamferRect(0.18, 0.12, 0.03), 0.26, 0.014), mat(0.63, 0.46, -0.13), { tint: STEEL }));
  for (const [y, z] of [[0.38, 0.05], [0.38, -0.05], [0.54, 0.05], [0.54, -0.05]] as const) {
    bolt(p.steel, mat(0.824, y, z, 0, 0, -Math.PI / 2), 0.7);
  }
  for (const [x, y] of [[0.5, 0.38], [0.76, 0.38], [0.5, 0.54], [0.76, 0.54]] as const) {
    bolt(p.steel, mat(x, y, 0.13, Math.PI / 2), 0.7);
  }
  // Ménsula entre el motor y la torre.
  p.steel.push(part(slab(chamferRect(0.06, 0.1, 0.015), 0.16, 0.008), mat(0.55, 0.17, -0.08), { tint: STEEL_DARK }));

  // Motor aletado a lo largo de Z, con la tapa redonda hacia la cámara (+Z).
  const prof: [number, number][] = [[0, 0], [0.11, 0], [0.125, 0.012], [0.125, 0.035]];
  for (let k = 0; k < 7; k++) {
    const y = 0.045 + k * 0.032;
    prof.push([0.125, y], [0.142, y + 0.004], [0.142, y + 0.014], [0.125, y + 0.018]);
  }
  prof.push([0.125, 0.285], [0.142, 0.29], [0.146, 0.296], [0.146, 0.33], [0.134, 0.342], [0.062, 0.342], [0.052, 0.352], [0, 0.352]);
  const motorZ0 = -0.12;
  p.steel.push(part(lathe(prof, 28), mat(0.7, 0.19, motorZ0, Math.PI / 2), { tint: STEEL_DARK, capAxis: "y", edge: 0 }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    bolt(p.steel, mat(0.7 + Math.cos(a) * 0.1, 0.19 + Math.sin(a) * 0.1, motorZ0 + 0.342, Math.PI / 2), 0.55);
  }
  // Bornera y prensacables.
  p.steel.push(part(slab(chamferRect(0.035, 0.06, 0.01), 0.12, 0.008), mat(0.875, 0.2, 0), { tint: STEEL }));
  const gland = lathe([[0.017, 0], [0.017, 0.016], [0.013, 0.02], [0.013, 0.032], [0.0, 0.032]], 8, true);
  for (const z of [0.035, 0.085]) {
    p.steel.push(part(gland.clone(), mat(0.875, 0.142, z, Math.PI), { tint: BOLT, capAxis: "y", edge: 0 }));
    p.steel.push(part(gland.clone(), mat(0.865, FLOOR + 0.08, z + 0.1), { tint: BOLT, capAxis: "y", edge: 0 }));
  }
  gland.dispose();

  // Cables trenzados: caen de la bornera y se abren un poco antes de la placa.
  for (const [z, dz, sag] of [[0.035, 0.1, 0.06], [0.085, 0.1, 0.035]] as const) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.875, 0.115, z),
      new THREE.Vector3(0.885, 0.0, z + 0.01),
      new THREE.Vector3(0.9 + sag * 0.3, -0.3, z + dz * 0.4),
      new THREE.Vector3(0.89 + sag * 0.2, -0.55, z + dz * 0.85),
      new THREE.Vector3(0.865, FLOOR + 0.13, z + dz),
      new THREE.Vector3(0.865, FLOOR + 0.1, z + dz),
    ]);
    const len = curve.getLength();
    p.cable.push(part(new THREE.TubeGeometry(curve, 40, 0.017, 8), mat(), { uv: "keep", uvScale: [len / 0.05, 1], edge: 0, tint: RUBBER }));
  }
}

/** Pedestal fijo completo (Group en unidades del modelo, ver arriba). */
export function buildRobotBase() {
  const p = newParts();

  // Placa base y zócalo.
  p.steel.push(part(slab(chamferRect(0.936, 0.936, 0.2), 0.08, 0.014), mat(0, FLOOR, 0, -Math.PI / 2), { tint: STEEL_DARK }));
  p.steel.push(part(slab(chamferRect(0.728, 0.728, 0.12), 0.06, 0.012), mat(0, FLOOR + 0.08, 0, -Math.PI / 2), { tint: STEEL }));
  const anchors: [number, number][] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) anchors.push([0.78 * sx, 0.78 * sz], [0.86 * sx, 0.42 * sz], [0.42 * sx, 0.86 * sz]);
  for (const [x, z] of anchors) anchor(p.steel, x, FLOOR + 0.08, z);
  // Tornillos del zócalo (tres por lado).
  for (let f = 0; f < 4; f++) {
    for (const x of [-0.3, 0, 0.3]) {
      const m = new THREE.Matrix4().makeRotationY((f * Math.PI) / 2).multiply(mat(x, TOWER_Y0, 0.675));
      bolt(p.steel, m, 0.7);
    }
  }

  // Torre: octógono con aristas achaflanadas, ahusado hacia arriba.
  const warp = (v: THREE.Vector3) => {
    const k = apothem(v.y) / TOWER_A0;
    v.x *= k;
    v.z *= k;
  };
  p.steel.push(part(slab(octagon(TOWER_A0 - 0.015, 0.03), TOWER_H, 0.015), mat(0, TOWER_Y0, 0, -Math.PI / 2), { tint: STEEL, warp }));
  // Flejes octogonales soldados (pie, cintura y cabeza de la torre): cortan
  // la superficie lisa y dan aristas para el brillo.
  for (const [y0, h] of [[TOWER_Y0, 0.07], [0.12, 0.035], [0.36, 0.06]] as const) {
    const r0 = (apothem(y0) + 0.012) / Math.cos(Math.PI / 8);
    const r1 = (apothem(y0 + h) + 0.012) / Math.cos(Math.PI / 8);
    const prof: [number, number][] = [[r0 - 0.01, y0], [r0, y0 + 0.008], [r1, y0 + h - 0.008], [r1 - 0.01, y0 + h], [r1 - 0.03, y0 + h]];
    p.steel.push(part(lathe(prof, 8, true, Math.PI / 8), mat(), { tint: STEEL_DARK, capAxis: "y" }));
  }

  for (let f = 0; f < 4; f++) towerPanel(p, f, f === 0);
  for (let k = 0; k < 4; k++) gusset(p, k);
  collar(p);
  gearMotor(p);

  return toGroup(p, "robot-base");
}

// ------------------------------------------------------------------ torreta --

/** Torreta giratoria (Group en unidades de la escena, ver arriba). */
export function buildRobotTurret() {
  const p = newParts();
  const AXIS_Y = 0.25;
  const opt: PartOptions = { tint: STEEL, capAxis: "y" };

  // Plato: chaflán inferior, canto con franja de seguridad, tapa.
  p.steel.push(part(lathe([[0.405, 0], [0.42, 0.012]], 64), mat(), opt));
  p.hazard.push(part(lathe([[0.42, 0.012], [0.42, 0.034]], 64), mat(), { uv: "keep", uvScale: [14, 1 / 0.19], capAxis: "y", edge: 0 }));
  p.steel.push(part(lathe([[0.42, 0.034], [0.408, 0.046], [0.0, 0.046]], 64), mat(), opt));
  // Anillo de cierre abulonado.
  p.steel.push(part(lathe([[0.372, 0.046], [0.372, 0.054], [0.364, 0.062], [0.3, 0.062], [0.3, 0.046]], 56), mat(), opt));
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    bolt(p.steel, mat(Math.cos(a) * 0.336, 0.062, Math.sin(a) * 0.336, 0, -a), 0.5);
  }

  // Mejillas de la horquilla.
  const cheek = new THREE.Shape();
  cheek.moveTo(-0.3, 0.046);
  cheek.lineTo(0.27, 0.046);
  cheek.lineTo(0.225, AXIS_Y);
  cheek.absarc(0, AXIS_Y, 0.225, 0, Math.PI, false);
  cheek.lineTo(-0.3, 0.046);
  for (const z of [0.18, -0.26]) {
    p.steel.push(part(slab(cheek, 0.08, 0.01, 28), mat(0, 0, z), { tint: STEEL }));
  }
  // Travesaño trasero (une las mejillas detrás del disco).
  p.hazard.push(part(slab(chamferRect(0.045, 0.1, 0.015), 0.36, 0.01), mat(-0.29, 0.15, -0.18), { uvScale: [1.4, 1.4] }));

  // −Z: maza con tuerca del eje.
  p.steel.push(
    part(
      lathe([[0.13, 0], [0.13, 0.022], [0.118, 0.032], [0.05, 0.032], [0.05, 0.05], [0.04, 0.06], [0, 0.06]], 40),
      mat(0, AXIS_Y, -0.26, -Math.PI / 2),
      { tint: STEEL, capAxis: "y", edge: 0 },
    ),
  );
  // +Z: servo del hombro con tapa abulonada.
  p.steel.push(
    part(
      lathe(
        [[0.13, 0], [0.13, 0.016], [0.122, 0.024], [0.122, 0.034], [0.128, 0.04], [0.128, 0.052], [0.122, 0.058], [0.122, 0.068], [0.128, 0.074], [0.128, 0.098], [0.116, 0.11], [0.05, 0.11], [0.044, 0.118], [0, 0.118]],
        40,
      ),
      mat(0, AXIS_Y, 0.26, Math.PI / 2),
      { tint: STEEL_DARK, capAxis: "y", edge: 0 },
    ),
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    bolt(p.steel, mat(Math.cos(a) * 0.088, AXIS_Y + Math.sin(a) * 0.088, 0.37, Math.PI / 2), 0.5);
    bolt(p.steel, mat(Math.cos(a) * 0.088, AXIS_Y + Math.sin(a) * 0.088, -0.292, -Math.PI / 2), 0.5);
  }

  // Cable del servo hacia el plato.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.14, 0.33),
    new THREE.Vector3(-0.1, 0.075, 0.36),
    new THREE.Vector3(-0.27, 0.075, 0.32),
    new THREE.Vector3(-0.37, 0.08, 0.2),
    new THREE.Vector3(-0.375, 0.05, 0.12),
  ]);
  p.cable.push(part(new THREE.TubeGeometry(curve, 28, 0.014, 8), mat(), { uv: "keep", uvScale: [curve.getLength() / 0.04, 1], edge: 0 }));

  return toGroup(p, "robot-turret");
}

/** Libera las geometrías de un Group armado acá (los materiales son compartidos). */
export function disposeRobotGroup(group: THREE.Group) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
}
