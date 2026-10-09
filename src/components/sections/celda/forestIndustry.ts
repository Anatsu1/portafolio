import * as THREE from "three";
import { groundHeight } from "./forestScatter";
import { ANTENNA, BELT_DIR, CABLES, CONTAINER, GATE, GENERATOR, KIOSK, MASTS, RAMP, type XZ } from "./forestSite";
import { robotMaterials, merge, part, slab } from "./robotMetal";
import { atlasTexture, consoleScreen, glowGradientTexture } from "./forestIndustryTextures";
import { type Parts, at, atlasPlane, box, cylY, cylZ, lathePart, newParts, painted, strut } from "./forestParts";
import { type BoxModel, buildBelt, conveyorParts, deliveries, stationBeacon } from "./forestConveyor";
import { PAD_R, padParts } from "./forestPad";

/*
 * El "puesto de campo": todo lo industrial instalado en el claro del bosque.
 * Contenedor con paneles solares del que sale la cinta, estación de recepción,
 * consola del operador, grupo electrógeno con su cerco, dos mástiles con
 * reflectores, barrera de acceso sobre el sendero, mástil de antena y los
 * cables que corren por el pasto hasta la plataforma del brazo.
 *
 * Mismo vocabulario que el brazo: el acero, las franjas y los cables usan los
 * materiales compartidos de robotMetal.ts (gunmetal gastado, amarillo
 * #d9a400, malla trenzada). Toda la geometría fija se fusiona por material:
 * acero, franjas, cables, luces, luces que titilan, conos de luz y atlas son
 * 7 draw calls para todo el puesto. Aparte: la pantalla de la consola, la
 * banda de la cinta, las cajas (instanciadas) y los haces de las balizas.
 *
 * Luces reales: UNA SpotLight fija (reflector sobre la plataforma). Nunca se
 * agrega ni se quita: el tema solo cambia su intensidad, así los shaders no
 * se recompilan al cambiar de tema (ver ReadySignal en CellScene).
 */

const STEEL = "#4d5256";
const DARK = "#34383b";
const MACHINED = "#7a7f83";
const CONCRETE = "#8a8780";
const LAMP = "#fff1d6";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const gy = (p: XZ) => groundHeight(p[0], p[1]) - 0.03;
/** Yaw que hace mirar el +Z local desde `p` hacia el brazo (origen). */
const faceOrigin = (p: XZ) => Math.atan2(-p[0], -p[1]);
/** Marco de una pieza apoyada en el suelo. */
const site = (p: XZ, rotY: number, lift = 0) => at(p[0], gy(p) + lift, p[1], 0, rotY, 0);
const mul = (a: THREE.Matrix4, b: THREE.Matrix4) => a.clone().multiply(b);

// ---- Contenedor ----------------------------------------------------------------------

/** Chapa ondulada (largo en X, alto en Y, ondas que salen hacia −Z). */
function corrugated(len: number, h: number, m: THREE.Matrix4, tint: string) {
  const pitch = 0.28;
  const depth = 0.04;
  const s = new THREE.Shape();
  s.moveTo(-len / 2, -0.012);
  const n = Math.floor(len / pitch);
  const x0 = -len / 2 + (len - n * pitch) / 2;
  s.lineTo(-len / 2, 0);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * pitch;
    s.lineTo(x + pitch * 0.1, 0);
    s.lineTo(x + pitch * 0.2, depth);
    s.lineTo(x + pitch * 0.6, depth);
    s.lineTo(x + pitch * 0.7, 0);
  }
  s.lineTo(len / 2, 0);
  s.lineTo(len / 2, -0.012);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2);
  return part(g, m, { tint, edge: 0.012 });
}

function containerParts(p: Parts) {
  const { len, wid, hgt } = CONTAINER;
  const yaw = Math.atan2(-BELT_DIR[1], BELT_DIR[0]);
  const base = site(CONTAINER.at, yaw, 0.03);
  const L = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => mul(base, at(x, y, z, rx, ry, rz));
  const body = "#575d61";
  // Paredes onduladas (las ondas hacia afuera), fondo, piso y techo.
  p.steel.push(corrugated(len - 0.2, hgt - 0.2, L(0, 0.1, -wid / 2 + 0.04), body));
  p.steel.push(corrugated(len - 0.2, hgt - 0.2, L(0, 0.1, wid / 2 - 0.04, 0, Math.PI), body));
  p.steel.push(corrugated(wid - 0.2, hgt - 0.2, L(-len / 2 + 0.04, 0.1, 0, 0, -Math.PI / 2), body));
  p.steel.push(box(len, 0.12, wid, L(0, 0.06, 0), DARK, 0.01));
  p.steel.push(box(len, 0.06, wid, L(0, hgt - 0.03, 0), body, 0.01));
  // Esquineros, largueros y travesaños (marco del contenedor).
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) p.steel.push(box(0.16, hgt, 0.16, L(sx * (len / 2 - 0.08), hgt / 2, sz * (wid / 2 - 0.08)), STEEL, 0.015));
  for (const sz of [-1, 1])
    for (const y of [0.08, hgt - 0.08]) p.steel.push(box(len - 0.3, 0.15, 0.11, L(0, y, sz * (wid / 2 - 0.05)), STEEL, 0.012));
  for (const y of [0.1, hgt - 0.12]) p.steel.push(box(0.12, 0.2, wid - 0.3, L(len / 2 - 0.06, y, 0), STEEL, 0.012));

  // Mampara en la boca con una ventana para la cinta (marco con franjas y
  // cortina de tiras: detrás nacen las cajas).
  const hatchW = 1.05;
  const hatchY0 = BELT_TOP_IN - 0.12;
  const hatchY1 = BELT_TOP_IN + 0.62;
  const shape = new THREE.Shape();
  shape.moveTo(-(wid - 0.3) / 2, 0.2);
  shape.lineTo((wid - 0.3) / 2, 0.2);
  shape.lineTo((wid - 0.3) / 2, hgt - 0.22);
  shape.lineTo(-(wid - 0.3) / 2, hgt - 0.22);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-hatchW / 2, hatchY0);
  hole.lineTo(-hatchW / 2, hatchY1);
  hole.lineTo(hatchW / 2, hatchY1);
  hole.lineTo(hatchW / 2, hatchY0);
  hole.closePath();
  shape.holes.push(hole);
  p.steel.push(part(slab(shape, 0.05, 0.008, 1), L(len / 2 - 0.16, 0, 0, 0, Math.PI / 2), { tint: "#4a5054" }));
  const fx = len / 2 - 0.09;
  for (const s of [-1, 1]) p.hazard.push(box(0.06, hatchY1 - hatchY0 + 0.1, 0.09, L(fx, (hatchY0 + hatchY1) / 2, s * (hatchW / 2 + 0.045)), "#ffffff", 0.008, [2, 2]));
  p.hazard.push(box(0.06, 0.09, hatchW + 0.18, L(fx, hatchY1 + 0.045, 0), "#ffffff", 0.008, [2, 2]));
  for (let i = 0; i < 7; i++) p.cable.push(box(0.012, hatchY1 - hatchY0 - 0.04, 0.15, L(fx - 0.03, (hatchY0 + hatchY1) / 2 + 0.02, -hatchW / 2 + 0.08 + i * ((hatchW - 0.16) / 6)), "#ffffff", 0));
  p.steel.push(box(0.04, hatchY1 - hatchY0, hatchW, L(len / 2 - 1.1, (hatchY0 + hatchY1) / 2, 0), "#151718", 0)); // fondo oscuro detrás de las tiras
  // Lámpara de mampara sobre la ventana y el cartel de la zona.
  p.steel.push(box(0.1, 0.12, 0.42, L(fx, hatchY1 + 0.3, 0), DARK, 0.015));
  p.glow.push(box(0.02, 0.07, 0.34, L(fx + 0.055, hatchY1 + 0.3, 0), LAMP, 0));
  p.atlas.push(atlasPlane(1.0, 0.375, "zone", L(len / 2 - 0.12, hgt - 0.55, -0.62, 0, Math.PI / 2)));

  // Puertas abiertas contra los costados, con barras de cierre.
  for (const s of [-1, 1]) {
    const dz = s * (wid / 2 + 0.07);
    const dx = len / 2 - wid / 4;
    p.steel.push(box(wid / 2 - 0.02, hgt - 0.18, 0.05, L(dx, hgt / 2, dz), body, 0.01));
    for (const y of [0.5, hgt / 2, hgt - 0.5]) p.steel.push(box(wid / 2 - 0.1, 0.06, 0.03, L(dx, y, dz + s * 0.035), STEEL, 0.008));
    for (const k of [-0.22, 0.22]) p.steel.push(cylY(0.018, hgt - 0.3, L(dx + k, 0.15, dz + s * 0.06), MACHINED, 8));
  }

  // Paneles solares sobre el techo, inclinados hacia la boca (y hacia el sol de la tarde).
  for (const x of [-1.45, 0, 1.45]) {
    const pm = L(x, hgt + 0.32, 0, 0, 0, -0.28);
    p.steel.push(box(1.08, 0.04, 2.02, mul(pm, at(0, -0.025, 0)), "#9aa0a4", 0.008));
    p.atlas.push(atlasPlane(1.0, 1.94, "solar", mul(pm, at(0, 0.0, 0, -Math.PI / 2, 0, Math.PI / 2))));
    for (const z of [-0.8, 0.8]) {
      p.steel.push(strut(V(x - 0.45, hgt, z).applyMatrix4(base), V(x - 0.45, hgt + 0.44, z).applyMatrix4(base), 0.04, STEEL));
      p.steel.push(strut(V(x + 0.45, hgt, z).applyMatrix4(base), V(x + 0.45, hgt + 0.18, z).applyMatrix4(base), 0.04, STEEL));
    }
  }
  // Caja de baterías e inversor al costado (lado de la cámara).
  p.steel.push(box(0.7, 0.9, 0.4, L(0.6, 0.55, wid / 2 + 0.35), STEEL, 0.02));
  p.hazard.push(box(0.72, 0.08, 0.42, L(0.6, 0.16, wid / 2 + 0.35), "#ffffff", 0.008));
  p.atlas.push(atlasPlane(0.24, 0.18, "volt", L(0.6, 0.72, wid / 2 + 0.552)));
  p.blink.push(box(0.04, 0.04, 0.02, L(0.84, 0.92, wid / 2 + 0.552), "#3dff8a", 0));
}

/** Altura de la banda respecto del piso del contenedor (la cinta entra a la boca). */
const BELT_TOP_IN = 0.62;

// ---- Consola ---------------------------------------------------------------------------

function kioskParts(p: Parts) {
  const base = site(KIOSK.at, faceOrigin(KIOSK.at));
  const L = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => mul(base, at(x, y, z, rx, ry, rz));
  p.steel.push(box(0.84, 0.08, 0.62, L(0, 0.04, 0), DARK, 0.012));
  p.steel.push(box(0.68, 0.92, 0.46, L(0, 0.54, 0), STEEL, 0.02));
  p.hazard.push(box(0.7, 0.09, 0.48, L(0, 0.2, 0), "#ffffff", 0.008));
  p.steel.push(box(0.52, 0.5, 0.02, L(0, 0.6, 0.235), "#454a4e", 0.006));
  p.steel.push(box(0.03, 0.14, 0.03, L(0.2, 0.62, 0.255), MACHINED, 0.006));
  // Pupitre inclinado y monitor (la pantalla es una malla aparte).
  p.steel.push(box(0.78, 0.05, 0.5, L(0, 1.03, 0.04, 0.35), DARK, 0.012));
  p.steel.push(box(0.66, 0.46, 0.07, L(0, 1.38, -0.08, -0.18), DARK, 0.02));
  p.steel.push(box(0.08, 0.3, 0.06, L(0, 1.12, -0.13), STEEL, 0.01));
  for (let i = 0; i < 5; i++) p.glow.push(box(0.05, 0.012, 0.03, L(-0.24 + i * 0.12, 1.07, 0.16, 0.35), i === 2 ? "#ff5a3c" : "#7fd3ff", 0));
  // Poste con baliza.
  p.steel.push(cylY(0.022, 0.85, L(0.3, 1.0, -0.17), MACHINED, 8));
  p.steel.push(lathePart([[0.06, 0], [0.06, 0.035], [0, 0.035]], L(0.3, 1.85, -0.17), DARK, 14));
  p.glow.push(lathePart([[0.045, 0], [0.045, 0.08], [0.033, 0.11], [0, 0.12]], L(0.3, 1.885, -0.17), "#ffa21f", 12));
  p.blink.push(box(0.03, 0.03, 0.015, L(-0.25, 0.92, 0.235), "#3dff8a", 0));
}

const KIOSK_SCREEN = () => mul(site(KIOSK.at, faceOrigin(KIOSK.at)), at(0, 1.38, -0.04, -0.18));
const KIOSK_BEACON = () => V(0.3, 1.95, -0.17).applyMatrix4(site(KIOSK.at, faceOrigin(KIOSK.at)));

// ---- Grupo electrógeno -----------------------------------------------------------------

function generatorParts(p: Parts) {
  const base = site(GENERATOR.at, GENERATOR.rotY);
  const L = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => mul(base, at(x, y, z, rx, ry, rz));
  for (const z of [-0.45, 0.45]) p.steel.push(box(2.5, 0.13, 0.1, L(0, 0.065, z), DARK, 0.01));
  for (const x of [-1.0, 0, 1.0]) p.steel.push(box(0.1, 0.1, 1.0, L(x, 0.05, 0), DARK, 0.008));
  const body = "#5a6064";
  p.steel.push(box(2.1, 1.05, 1.0, L(0, 0.655, 0), body, 0.025));
  p.steel.push(box(2.16, 0.05, 1.06, L(0, 1.205, 0), DARK, 0.012));
  // Rejilla de ventilación (lamas inclinadas) del lado que ve la cámara.
  for (let i = 0; i < 8; i++) p.steel.push(box(0.8, 0.022, 0.06, L(0.48, 0.42 + i * 0.075, 0.51, 0.6), DARK, 0.004));
  // Puerta del tablero con display, placa de peligro y franjas en las esquinas.
  p.steel.push(box(0.6, 0.66, 0.025, L(-0.5, 0.72, 0.505), "#4c5256", 0.008));
  p.glow.push(box(0.22, 0.11, 0.01, L(-0.6, 0.9, 0.52), "#9fe8ff", 0));
  p.atlas.push(atlasPlane(0.26, 0.2, "volt", L(-0.38, 0.6, 0.52)));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.hazard.push(box(0.07, 1.05, 0.07, L(sx * 1.03, 0.655, sz * 0.49), "#ffffff", 0.006));
  // Escape con sombrerete y baliza de estado (roja/ámbar apagadas, verde prendida).
  p.steel.push(cylY(0.055, 0.6, L(0.8, 1.23, -0.25), DARK, 12));
  p.steel.push(lathePart([[0.075, 0], [0.075, 0.03], [0, 0.07]], L(0.8, 1.86, -0.25), DARK, 12));
  p.steel.push(cylY(0.018, 0.2, L(-0.9, 1.23, -0.3), MACHINED, 8));
  const lenses: [string, number][] = [["#4a1410", 0], ["#4a3410", 1], ["#3dff8a", 2]];
  for (const [c, i] of lenses) p.glow.push(cylY(0.045, 0.08, L(-0.9, 1.43 + i * 0.085, -0.3), c, 12));
  // Cerco bajo delante, con la placa de peligro.
  const fz = 1.05;
  for (const x of [-1.0, 0, 1.0]) {
    p.steel.push(cylY(0.03, 1.0, L(x, 0, fz), STEEL, 8));
    p.steel.push(box(0.22, 0.03, 0.22, L(x, 0.015, fz), DARK, 0.006));
  }
  for (const y of [0.5, 0.92]) p.hazard.push(box(2.04, 0.07, 0.04, L(0, y, fz + 0.035), "#ffffff", 0.006, [2, 2]));
  p.atlas.push(atlasPlane(0.3, 0.23, "volt", L(0.5, 0.71, fz + 0.06)));
}

// ---- Mástiles con reflectores ---------------------------------------------------------

/** Rotación que lleva el +Z local a mirar hacia `dir`. */
const aim = (from: THREE.Vector3, to: THREE.Vector3) => new THREE.Matrix4().lookAt(to, from, V(0, 1, 0)).setPosition(from);

/** Reflectores (mundo): de dónde salen y a qué punto del claro apuntan. */
export const FLOODS: { from: THREE.Vector3; to: THREE.Vector3 }[] = [];

function mastParts(p: Parts) {
  for (const mast of MASTS) {
    const y0 = gy(mast.at);
    const yaw = faceOrigin(mast.at);
    const base = at(mast.at[0], y0, mast.at[1], 0, yaw, 0);
    const L = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => mul(base, at(x, y, z, rx, ry, rz));
    const H = mast.height;
    p.steel.push(box(0.62, 0.16, 0.62, L(0, 0.08, 0), CONCRETE, 0.02));
    p.steel.push(box(0.4, 0.025, 0.4, L(0, 0.172, 0), STEEL, 0.006));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.steel.push(lathePart([[0.03, 0], [0.03, 0.04], [0, 0.04]], L(sx * 0.15, 0.184, sz * 0.15), MACHINED, 6, true));
    p.steel.push(lathePart([[0.075, 0.18], [0.068, H * 0.5], [0.05, H], [0, H]], L(0, 0, 0), "#5f6569", 14));
    // Caja de conexiones con su placa y el cable que baja.
    p.steel.push(box(0.24, 0.32, 0.14, L(0, 1.25, 0.12), STEEL, 0.015));
    p.hazard.push(box(0.25, 0.05, 0.15, L(0, 1.08, 0.12), "#ffffff", 0.005));
    p.atlas.push(atlasPlane(0.16, 0.12, "volt", L(0, 1.27, 0.192)));
    p.cable.push(cablePart([V(0, 1.1, 0.12), V(0.02, 0.6, 0.1), V(0.06, 0.12, 0.2), V(0.1, 0.02, 0.5)].map((v) => v.applyMatrix4(base))));
    // Travesaño y dos reflectores apuntando a la plataforma.
    p.steel.push(box(1.1, 0.07, 0.07, L(0, H - 0.12, 0), STEEL, 0.01));
    for (const sx of [-1, 1]) {
      const from = V(sx * 0.42, H - 0.12, 0.12).applyMatrix4(base);
      const to = V(sx * 0.9 + 0.3 * Math.sign(mast.at[0]), 0, 0.4);
      FLOODS.push({ from, to });
      const head = aim(from, to);
      const H2 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => mul(head, at(x, y, z, rx, ry, rz));
      p.steel.push(box(0.36, 0.26, 0.14, H2(0, 0, 0), DARK, 0.02));
      for (let k = 0; k < 4; k++) p.steel.push(box(0.32, 0.012, 0.06, H2(0, -0.09 + k * 0.06, -0.09), STEEL, 0));
      p.glow.push(box(0.3, 0.2, 0.01, H2(0, 0, 0.072), LAMP, 0));
      p.steel.push(strut(from.clone().add(V(0, -0.12, 0)), V(sx * 0.42, H - 0.12, 0).applyMatrix4(base), 0.03, STEEL));
      // Cono de luz (aditivo, borde suave) y charco en el piso.
      const dir = to.clone().sub(from);
      const len = dir.length() * 0.92;
      const cone = new THREE.ConeGeometry(len * 0.24, len, 20, 1, true).translate(0, -len / 2, 0);
      const uv = cone.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.75, uv.getY(i));
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), dir.normalize());
      p.beam.push(part(cone, new THREE.Matrix4().compose(from, q, V(1, 1, 1)), { uv: "keep", wear: 2, tint: "#ffd9a0" }));
      const pool = new THREE.PlaneGeometry(3.2, 3.2);
      const puv = pool.attributes.uv;
      for (let i = 0; i < puv.count; i++) puv.setXY(i, puv.getX(i) * 0.5, puv.getY(i));
      p.beam.push(part(pool, at(to.x, 0.012, to.z, -Math.PI / 2), { uv: "keep", edge: 0, tint: "#ffcf8a" }));
    }
  }
}

// ---- Barrera, rampa, antena y cables ----------------------------------------------------

function gateParts(p: Parts) {
  const base = site(GATE.at, GATE.rotY);
  const L = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => mul(base, at(x, y, z, rx, ry, rz));
  p.steel.push(box(0.5, 0.12, 0.5, L(0, 0.06, 0), CONCRETE, 0.02));
  p.atlas.push(painted(new THREE.BoxGeometry(0.24, 0.95, 0.24), L(0, 0.595, 0)));
  p.hazard.push(box(0.26, 0.12, 0.26, L(0, 0.95, 0), "#ffffff", 0.008));
  p.steel.push(box(0.34, 0.22, 0.28, L(0, 1.18, 0), DARK, 0.02));
  // Pluma levantada (pivote en la caja) y contrapeso.
  const piv = L(0, 1.22, 0.17, 0, 0, 1.2);
  p.hazard.push(box(GATE.armLen, 0.08, 0.05, mul(piv, at(GATE.armLen / 2 - 0.1, 0, 0)), "#ffffff", 0.01, [1.4, 1.4]));
  p.steel.push(box(0.36, 0.16, 0.1, mul(piv, at(-0.3, 0, 0)), DARK, 0.015));
  p.steel.push(cylZ(0.05, 0.08, mul(piv, at(0, 0, -0.02)), MACHINED, 12));
  p.blink.push(box(0.03, 0.03, 0.06, mul(piv, at(GATE.armLen - 0.15, 0.045, 0)), "#ff3b2f", 0));
  // Cartel "ZONA ROBOTIZADA" en su soporte, mirando al claro.
  for (const x of [-0.95, -0.15]) p.steel.push(cylY(0.022, 1.25, L(x, 0, 0.25), MACHINED, 8));
  p.steel.push(box(0.92, 0.38, 0.02, L(-0.55, 1.05, 0.23), DARK, 0.005));
  p.atlas.push(atlasPlane(0.88, 0.33, "zone", L(-0.55, 1.05, 0.242)));
}

function rampParts(p: Parts) {
  const s = new THREE.Shape();
  s.moveTo(-0.26, 0);
  s.lineTo(-0.1, 0.05);
  s.lineTo(0.1, 0.05);
  s.lineTo(0.26, 0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: RAMP.len, bevelEnabled: false }).translate(0, 0, -RAMP.len / 2).rotateY(Math.PI / 2);
  p.hazard.push(part(g, site(RAMP.at, RAMP.rotY, 0.005), { tint: "#ffffff", edge: 0, uvScale: [1.6, 1.6] }));
}

function antennaParts(p: Parts) {
  const base = site(ANTENNA.at, faceOrigin(ANTENNA.at));
  const H = ANTENNA.height;
  const galv = "#8d9397";
  p.steel.push(box(1.0, 0.18, 1.0, mul(base, at(0, 0.09, 0)), CONCRETE, 0.02));
  const leg = (k: number, y: number) => {
    const r = 0.3 - (0.18 * y) / H;
    const a = (k / 3) * Math.PI * 2 + Math.PI / 2;
    return V(Math.cos(a) * r, y + 0.18, Math.sin(a) * r).applyMatrix4(base);
  };
  const levels = 8;
  for (let k = 0; k < 3; k++) {
    p.steel.push(strut(leg(k, 0), leg(k, H), 0.04, galv));
    for (let i = 0; i < levels; i++) {
      const y0 = (i / levels) * H;
      const y1 = ((i + 1) / levels) * H;
      p.steel.push(strut(leg(k, y1), leg((k + 1) % 3, y1), 0.018, galv));
      p.steel.push(strut(leg(k, y0), leg((k + 1) % 3, y1), 0.014, galv));
    }
  }
  // Parábola, dos antenas de panel y baliza de balizamiento (titila).
  const dish = mul(base, at(0, H * 0.72, 0.32, Math.PI / 2 - 0.15, 0, 0));
  p.steel.push(lathePart([[0.0, 0.0], [0.2, 0.025], [0.36, 0.08], [0.44, 0.13], [0.43, 0.135], [0.0, 0.01]], dish, "#c9cdd0", 20));
  p.steel.push(strut(V(0, 0.13, 0).applyMatrix4(dish), V(0, 0.42, 0).applyMatrix4(dish), 0.015, galv));
  for (const a of [0, 2.1]) p.steel.push(box(0.14, 0.7, 0.06, mul(base, at(Math.cos(a) * 0.2, H - 0.5, Math.sin(a) * 0.2, 0, -a)), "#b9bec1", 0.02));
  p.steel.push(cylY(0.012, 0.5, mul(base, at(0, H + 0.18, 0)), galv, 6));
  p.blink.push(lathePart([[0.06, 0], [0.06, 0.06], [0.03, 0.1], [0, 0.11]], mul(base, at(0, H + 0.68, 0)), "#ff3b2f", 12));
}

/** Tubo trenzado a lo largo de puntos (curva suave). */
function cablePart(points: THREE.Vector3[], radius = 0.022) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const len = curve.getLength();
  return part(new THREE.TubeGeometry(curve, Math.max(8, Math.round(len * 10)), radius, 6), new THREE.Matrix4(), { uv: "keep", uvScale: [len / 0.05, 1], edge: 0 });
}

/** Cables del piso: arrancan de una caja de conexión sobre la chapa y siguen el terreno. */
function cableParts(p: Parts) {
  const R = 0.022;
  for (const line of CABLES) {
    const pts = line.map(([x, z]) => {
      const r = Math.hypot(x, z);
      const y = r < PAD_R - 0.1 ? 0.005 : groundHeight(x, z) - 0.03;
      return V(x, y + R * 0.8, z);
    });
    const [x0, z0] = line[0];
    const r0 = Math.hypot(x0, z0);
    if (r0 < PAD_R + 0.4) {
      // Caja de conexión al borde de la plataforma y tramo sobre la chapa.
      const k = 3.06 / r0;
      const jx = x0 * k;
      const jz = z0 * k;
      const yaw = Math.atan2(-jx, -jz);
      p.steel.push(box(0.16, 0.06, 0.12, at(jx, 0.035, jz, 0, yaw), STEEL, 0.008));
      p.hazard.push(box(0.17, 0.012, 0.13, at(jx, 0.067, jz, 0, yaw), "#ffffff", 0.003));
      pts.unshift(V(jx * 1.03, 0.03, jz * 1.03));
      // Cae por el canto biselado.
      pts.splice(2, 0, V(x0 * (PAD_R + 0.08) / r0, -0.01, z0 * (PAD_R + 0.08) / r0));
    }
    const last = pts[pts.length - 1];
    pts.push(last.clone().add(V(0, 0.18, 0)));
    // Un poco de ondulación lateral, como un cable tirado a mano.
    const wavy: THREE.Vector3[] = [];
    pts.forEach((v, i) => {
      wavy.push(v);
      const n = pts[i + 1];
      if (!n || n.y - v.y > 0.1) return;
      const mid = v.clone().lerp(n, 0.5);
      const side = V(-(n.z - v.z), 0, n.x - v.x).normalize().multiplyScalar(0.05 * Math.sin(i * 2.3 + v.x));
      wavy.push(mid.add(side));
    });
    p.cable.push(cablePart(wavy, R));
  }
}

// ---- Materiales propios ---------------------------------------------------------------

/**
 * Conos y charcos de luz: aditivos, sin escribir profundidad. En los conos
 * (`wear` = 2) el borde se apaga según el ángulo de vista, así no se ve la
 * silueta dura del cono. Funciona también instanciado (haces de las balizas).
 */
function beamMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, opacity: { value: 0.3 } },
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float wear;
      varying vec2 vUv;
      varying vec3 vCol;
      varying float vSoft;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        vec4 mv = modelViewMatrix * p;
        vN = normalize(normalMatrix * n);
        vV = normalize(-mv.xyz);
        vUv = uv;
        vCol = color;
        vSoft = step(1.5, wear);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vCol;
      varying float vSoft;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float edge = mix(1.0, pow(abs(dot(normalize(vN), normalize(vV))), 1.6), vSoft);
        gl_FragColor = vec4(texture2D(map, vUv).rgb * vCol * opacity * edge, 1.0);
      }`,
  });
}

/** Haz doble de una baliza giratoria (dos conos opuestos sobre X). */
function beaconBeamGeometry() {
  const h = 0.9;
  const cones = [Math.PI / 2, -Math.PI / 2].map((rz) => {
    const c = new THREE.ConeGeometry(0.22, h, 14, 1, true).translate(0, -h / 2, 0).rotateZ(rz);
    const uv = c.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.75, uv.getY(i));
    return part(c, new THREE.Matrix4(), { uv: "keep", wear: 2, tint: "#ffa21f" });
  });
  return merge(cones);
}

export type ForestIndustry = ReturnType<typeof buildForestIndustry>;

export function buildForestIndustry(model: BoxModel) {
  const group = new THREE.Group();
  group.name = "forest-industry";
  const own: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (own.push(x), x);

  FLOODS.length = 0;
  const p = newParts();
  padParts(p);
  conveyorParts(p);
  containerParts(p);
  kioskParts(p);
  generatorParts(p);
  mastParts(p);
  gateParts(p);
  rampParts(p);
  antennaParts(p);
  cableParts(p);

  const robot = robotMaterials(); // compartidos con el brazo: no se liberan acá
  const atlas = keep(atlasTexture());
  const gradient = keep(glowGradientTexture());
  const glowMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const blinkMat = keep(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const beamMat = keep(beamMaterial(gradient));
  const beaconMat = keep(beamMaterial(gradient));
  const atlasMat = keep(new THREE.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: 0.5, metalness: 0.25 }));
  const meshes: [THREE.BufferGeometry[], THREE.Material][] = [
    [p.steel, robot.steel],
    [p.hazard, robot.hazard],
    [p.cable, robot.cable],
    [p.atlas, atlasMat],
    [p.glow, glowMat],
    [p.blink, blinkMat],
    [p.beam, beamMat],
  ];
  for (const [list, mat] of meshes) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(keep(merge(list)), mat);
    if (mat === beamMat) mesh.renderOrder = 2;
    group.add(mesh);
  }

  // Pantalla de la consola.
  const screen = consoleScreen();
  keep(screen.texture);
  const screenMat = keep(new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  const screenMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.58, 0.38)), screenMat);
  screenMesh.matrixAutoUpdate = false;
  screenMesh.matrix.copy(KIOSK_SCREEN()).multiply(at(0, 0, 0.037));
  group.add(screenMesh);

  // Cinta y cajas.
  const belt = buildBelt(model);
  keep(belt);
  group.add(belt.group);

  // Haces de las balizas giratorias (instanciados: un draw call).
  const beacons = [stationBeacon(), KIOSK_BEACON()];
  const beaconGeo = keep(beaconBeamGeometry());
  const beaconMesh = new THREE.InstancedMesh(beaconGeo, beaconMat, beacons.length);
  beaconMesh.frustumCulled = false;
  beaconMesh.renderOrder = 2;
  group.add(beaconMesh);

  // Reflector real: apunta a la plataforma desde el mástil izquierdo.
  const spot = new THREE.SpotLight("#ffd29a", 0, 0, 0.55, 0.7, 2);
  const flood = FLOODS[1] ?? FLOODS[0];
  spot.position.copy(flood.from);
  spot.target.position.set(0, 0, 0.3);
  group.add(spot, spot.target);

  const tmp = new THREE.Object3D();
  let accent = "#3b82f6";
  let lastTick = -1;
  let blinkBase = 1;
  return {
    group,
    setTheme(dusk: boolean, rim: string) {
      accent = rim;
      lastTick = -1;
      glowMat.color.setScalar(dusk ? 1.5 : 0.85);
      blinkBase = dusk ? 1.6 : 1;
      beamMat.uniforms.opacity.value = dusk ? 0.9 : 0.06;
      beaconMat.uniforms.opacity.value = dusk ? 0.55 : 0.18;
      spot.intensity = dusk ? 55 : 0;
    },
    update(t: number) {
      belt.update(t);
      beacons.forEach((pos, i) => {
        tmp.position.copy(pos);
        tmp.rotation.set(0, t * 3.4 + i * 1.7, 0);
        tmp.updateMatrix();
        beaconMesh.setMatrixAt(i, tmp.matrix);
      });
      beaconMesh.instanceMatrix.needsUpdate = true;
      // Destello corto cada ~1,3 s (balizamiento y LEDs de estado).
      blinkMat.color.setScalar(blinkBase * ((t * 0.75) % 1 < 0.18 ? 1 : 0.18));
      // La pantalla se redibuja 4 veces por segundo (dibujar un canvas cuesta).
      const tick = Math.floor(t * 4);
      if (tick !== lastTick) {
        lastTick = tick;
        const d = deliveries(t);
        screen.draw(accent, 312 + d.count, d.busy, tick);
      }
    },
    dispose() {
      own.forEach((d) => d.dispose());
    },
  };
}

