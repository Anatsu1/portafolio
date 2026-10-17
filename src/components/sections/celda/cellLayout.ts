import { LAB_BOXES as CELL_BOXES } from "../../../data/cell";
import { CELL_TECH } from "../../../data/cellTech";

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

/**
 * Estante de tecnologías, detrás del brazo (hacia -Z): un arco al alcance de la
 * garra. El índice de una caja de tecnología es `CELL_BOXES.length + i`.
 */
export const TECH_RADIUS = 2.5;
export const TECH_CENTER = Math.PI / 2; // yaw que apunta hacia el fondo (-Z)
export const TECH_SPREAD = 2.0;

export function techSlot(i: number): Polar {
  const count = CELL_TECH.length;
  const t = count === 1 ? 0.5 : i / (count - 1);
  // De derecha a izquierda vista desde la cámara: el yaw crece hacia -X.
  return { phi: TECH_CENTER - TECH_SPREAD / 2 + t * TECH_SPREAD, r: TECH_RADIUS };
}

/** Total de cajas de la escena: secciones + tecnologías. */
export const TOTAL_BOXES = CELL_BOXES.length + CELL_TECH.length;

/** Lugar de reposo de cualquier caja (sección o tecnología). */
export function slotFor(index: number): Polar {
  return index < CELL_BOXES.length ? slotOf(index) : techSlot(index - CELL_BOXES.length);
}

/**
 * Las cajas del estante trasero se guardan con la chapa mirando hacia la base
 * (o sea hacia la cámara, porque están detrás): media vuelta respecto de las
 * del arco delantero, que miran hacia afuera.
 */
export function yawFlip(index: number) {
  return index < CELL_BOXES.length ? 0 : Math.PI;
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
