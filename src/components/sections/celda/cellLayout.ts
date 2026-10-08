import { CELL_BOXES } from "../../../data/cell";

/**
 * Geometría de la celda: dónde está cada caja y la plataforma de entrega.
 * Todo se expresa en polares (`phi` = yaw del brazo, `r` = distancia al eje de
 * la base), porque así el brazo gira alrededor de la base sin cruzar por
 * encima de ella.
 */
export const ARC_RADIUS = 2.0;
export const ARC_CENTER = -Math.PI / 2; // yaw que apunta hacia la cámara (+Z)
export const ARC_SPREAD = (Math.PI * 5) / 9; // 100° en total
export const BOX_HALF_H = 0.22; // la caja escalada mide ~0,44 de alto

/** Plataforma de entrega: un poco más allá del último lugar del arco. */
export const DELIVERY = { phi: ARC_CENTER + ARC_SPREAD / 2 + 0.8, r: ARC_RADIUS };

export type Polar = { phi: number; r: number };

export function slotOf(index: number): Polar {
  const count = CELL_BOXES.length;
  const t = count === 1 ? 0.5 : index / (count - 1);
  return { phi: ARC_CENTER - ARC_SPREAD / 2 + t * ARC_SPREAD, r: ARC_RADIUS };
}

/** Posición cartesiana de un punto polar (y a la altura dada). */
export function cartesian({ phi, r }: Polar, y: number): [number, number, number] {
  return [r * Math.cos(phi), y, -r * Math.sin(phi)];
}

/** La placa mira a +Z en el modelo; se gira para que mire hacia afuera. */
export function facingOutward(phi: number) {
  return phi + Math.PI / 2;
}

/** Posición de la cámara (también la usa la caja para girar de frente). */
export const CAMERA_POS = { x: 1.4, y: 3.9, z: 7.4 };
export const CAMERA_TARGET = { x: 0.1, y: 1.15, z: 0.6 };

/** Yaw con el que la placa (que mira a +Z) queda de frente a la cámara desde (x, z). */
export function facingCamera(x: number, z: number) {
  return Math.atan2(CAMERA_POS.x - x, CAMERA_POS.z - z);
}

/** Cuánto crece la caja al mostrarse en la plataforma ("giro grande"). */
export const SHOWCASE_SCALE = 2.4;

/** Segundos que el panel queda abierto en automático (el visitante puede frenarlo). */
export const HOLD_AUTO_S = 8;
