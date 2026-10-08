import { ARM, type ArmPose } from "./RobotArm";

/**
 * Distancia vertical entre el pivote de la muñeca y el centro de lo que la
 * garra tiene agarrado (medida del modelo: centro de las almohadillas).
 */
export const TOOL_DROP = 1.12;

/** Punto a alcanzar: el centro de la caja, en polares alrededor de la base. */
export type ReachTarget = { phi: number; r: number; y: number };

/**
 * Cinemática inversa analítica del brazo planar de dos segmentos + giro de
 * base. Escribe `yaw`, `shoulder` y `elbow` en `pose` (no toca `grip`). La
 * muñeca queda `TOOL_DROP` por encima del objetivo, así la garra cuelga
 * vertical sobre él. Elige la solución "codo arriba".
 */
export function solveIK(target: ReachTarget, pose: ArmPose) {
  const { SEG1_LEN: l1, SEG2_LEN: l2, SHOULDER_Y } = ARM;
  const dx = target.r;
  const dy = target.y + TOOL_DROP - SHOULDER_Y;

  const min = Math.abs(l1 - l2) + 0.02;
  const max = l1 + l2 - 0.02;
  const d = Math.min(max, Math.max(min, Math.hypot(dx, dy)));

  // Ley de los cosenos: ángulo en el codo y ángulo del hombro sobre la línea al objetivo.
  const interior = Math.acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
  const lift = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));

  pose.yaw = target.phi;
  pose.shoulder = Math.atan2(dy, dx) + lift;
  pose.elbow = -(Math.PI - interior);
}
