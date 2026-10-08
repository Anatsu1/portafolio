import { useEffect, useMemo } from "react";
import { buildRobotBase, buildRobotTurret, disposeRobotGroup } from "./robotBaseGeometry";

/*
 * Pedestal y torreta del brazo como geometría procedural (ver
 * robotBaseGeometry.ts para medidas y robotMetal.ts para el material).
 *
 * Contrato con RobotArm:
 *  - <RobotBase />: pedestal fijo en unidades del modelo (1,9 × 1,5 × 1,9,
 *    origen al centro). RobotArm lo escala BASE_SCALE y lo sube BASE_HALF_H.
 *  - <RobotTurret />: va dentro del grupo `yaw`, con el origen sobre el plano
 *    superior del pedestal; la horquilla tiene el eje del hombro en y = 0,25.
 *
 * Cada uno es un Group con una malla por material (pedestal: 4 draw calls,
 * torreta: 3). Los materiales y texturas son compartidos y no se liberan.
 */

function useBuilt(build: () => ReturnType<typeof buildRobotBase>) {
  const group = useMemo(build, [build]);
  useEffect(() => () => disposeRobotGroup(group), [group]);
  return group;
}

export default function RobotBase() {
  return <primitive object={useBuilt(buildRobotBase)} />;
}

export function RobotTurret() {
  return <primitive object={useBuilt(buildRobotTurret)} />;
}
