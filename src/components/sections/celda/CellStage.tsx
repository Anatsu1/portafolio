import RobotArm from "./RobotArm";
import CargoBox from "./CargoBox";
import DeliveryPad from "./DeliveryPad";
import { CELL_BOXES } from "../../../data/cell";
import {
  useCellController,
  type CellCommands,
  type CellMode,
} from "../../../hooks/useCellController";
import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";
import { BOX_HALF_H, cartesian, facingOutward, slotOf } from "./cellLayout";

type CellStageProps = {
  active: boolean;
  mode: CellMode;
  glow: string;
  showing: number | null;
  commandsRef: MutableRefObject<CellCommands | null>;
  onShowing: (index: number | null) => void;
  onDelivered: (index: number | null) => void;
  /** Se llama al elegir una caja con el mouse. */
  onPick: (index: number) => void;
};

/** Lo que se mueve dentro del Canvas: el brazo, las cajas y la plataforma. */
export default function CellStage({ active, mode, glow, showing, commandsRef, onShowing, onDelivered, onPick }: CellStageProps) {
  // Una apertura de tapa (0..1) por caja: el controlador la anima y cada caja la lee.
  const openRefs = useRef<MutableRefObject<number>[]>(CELL_BOXES.map(() => ({ current: 0 })));
  // Luz interior ÚNICA de las cajas: siempre presente (intensidad 0 si ninguna está abierta).
  const sharedLight = useRef<PointLight | null>(null);
  // Antes que las cajas (prioridad negativa): apaga la luz para que la caja más abierta la reclame.
  useFrame(() => {
    const l = sharedLight.current;
    if (!l) return;
    l.userData.best = 0;
    l.intensity = 0;
  }, -1);
  const { poseRef, boxRefs } = useCellController({
    count: CELL_BOXES.length,
    active,
    mode,
    onShowing,
    onDelivered,
    commandsRef,
    openRefs: openRefs.current,
  });

  return (
    <>
      <pointLight ref={sharedLight} intensity={0} distance={1} decay={2} />
      <RobotArm poseRef={poseRef} />
      <DeliveryPad />
      {CELL_BOXES.map((box, i) => {
        const slot = slotOf(i);
        return (
          <CargoBox
            key={box.id}
            ref={(group) => {
              boxRefs.current[i] = group;
            }}
            id={box.id}
            label={box.label}
            glow={glow}
            openRef={openRefs.current[i]}
            sharedLight={sharedLight}
            selected={showing === i}
            onSelect={() => onPick(i)}
            position={cartesian(slot, BOX_HALF_H)}
            rotationY={facingOutward(slot.phi)}
          />
        );
      })}
    </>
  );
}
