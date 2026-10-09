import * as THREE from "three";
import { chamferRect, lathe, part, slab } from "./robotMetal";
import { ATLAS } from "./forestIndustryTextures";

/*
 * Piezas sueltas para armar el equipamiento del puesto de campo con el mismo
 * vocabulario que la base del brazo (robotMetal.ts): cajas con chaflanes
 * reales, tornos, varillas y placas. Cada función devuelve una geometría ya
 * transformada y "preparada" (`part`: UV, tinte, desgaste) para fusionarla:
 * todo lo que comparte material termina en UN draw call.
 */

/** Listas de geometrías por material (ver `buildForestIndustry`). */
export type Parts = {
  /** Acero gunmetal del brazo (con desgaste en los bordes). */
  steel: THREE.BufferGeometry[];
  /** Franjas de seguridad amarillo/negro del brazo. */
  hazard: THREE.BufferGeometry[];
  /** Malla trenzada negra de los cables del brazo (también goma). */
  cable: THREE.BufferGeometry[];
  /** Luces encendidas (lámparas, LEDs): color por vértice, sin sombreado. */
  glow: THREE.BufferGeometry[];
  /** Luces que titilan (baliza de la antena, LEDs de estado). */
  blink: THREE.BufferGeometry[];
  /** Conos y charcos de luz (aditivos). `wear` = 2 marca los conos (borde suave). */
  beam: THREE.BufferGeometry[];
  /** Carteles, celdas solares y pintura lisa (atlas de canvas). */
  atlas: THREE.BufferGeometry[];
};

export const newParts = (): Parts => ({ steel: [], hazard: [], cable: [], glow: [], blink: [], beam: [], atlas: [] });

/**
 * Caja de w × h × d centrada en el origen, con aristas achaflanadas (`bevel`).
 * El chaflán es lo que hace brillar los bordes, como en el pedestal.
 */
export function box(w: number, h: number, d: number, m: THREE.Matrix4, tint: string, bevel = 0.01, uvScale: [number, number] = [1, 1]) {
  const b = Math.min(bevel, w * 0.3, h * 0.3, d * 0.3);
  const g = b > 0.0005 ? slab(chamferRect(w / 2 - b, h / 2 - b, b), d, b, 1) : new THREE.BoxGeometry(w, h, d).translate(0, 0, d / 2);
  g.translate(0, 0, -d / 2);
  return part(g, m, { tint, uvScale, edge: b > 0.0005 ? 0.022 : 0 });
}

/** Torno (perfil [radio, y]) ya ubicado. */
export function lathePart(profile: [number, number][], m: THREE.Matrix4, tint: string, segments = 16, facet = false) {
  return part(lathe(profile, segments, facet), m, { tint, capAxis: "y" });
}

/** Cilindro a lo largo de Z local (rodillos, tambores, motores), con canto chaflanado. */
export function cylZ(r: number, len: number, m: THREE.Matrix4, tint: string, segments = 16, wear = 0) {
  const b = Math.min(0.006, r * 0.15);
  const g = lathe(
    [
      [0, -len / 2],
      [r - b, -len / 2],
      [r, -len / 2 + b],
      [r, len / 2 - b],
      [r - b, len / 2],
      [0, len / 2],
    ],
    segments,
  ).rotateX(Math.PI / 2);
  return part(g, m, { tint, wear, edge: 0 });
}

/** Cilindro vertical de altura h (desde y = 0). */
export function cylY(r: number, h: number, m: THREE.Matrix4, tint: string, segments = 12) {
  return lathePart([[0, 0], [r, 0], [r, h], [0, h]], m, tint, segments);
}

const Y = new THREE.Vector3(0, 1, 0);

/** Varilla de sección cuadrada entre dos puntos (patas, riostras, travesaños). */
export function strut(a: THREE.Vector3, b: THREE.Vector3, thick: number, tint: string) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()), new THREE.Vector3(1, 1, 1));
  return part(new THREE.BoxGeometry(thick, len, thick), m, { tint, edge: 0 });
}

/** Plano w × h (mira a +Z) con la región `region` del atlas. */
export function atlasPlane(w: number, h: number, region: keyof typeof ATLAS, m: THREE.Matrix4) {
  const [u0, v0, u1, v1] = ATLAS[region];
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
  return part(g, m, { uv: "keep", edge: 0 });
}

/**
 * Geometría pintada de un color liso con el material del atlas: todas sus UV
 * caen en la muestra de pintura amarilla del atlas (el tinte la oscurece si hace falta).
 */
export function painted(g: THREE.BufferGeometry, m: THREE.Matrix4, tint = "#ffffff") {
  const [u0, v0, u1, v1] = ATLAS.paint;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (u0 + u1) / 2, (v0 + v1) / 2);
  return part(g, m, { uv: "keep", edge: 0, tint });
}

/** Matriz desde posición + Euler (XYZ). */
export function at(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
}
