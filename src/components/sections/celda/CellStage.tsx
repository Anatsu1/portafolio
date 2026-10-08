import RobotArm from "./RobotArm";
import CargoBox from "./CargoBox";
import DeliveryPad from "./DeliveryPad";
import { CELL_BOXES } from "../../../data/cell";
import {
  useCellController,
  type CellCommands,
  type CellMode,
} from "../../../hooks/useCellController";
import type { MutableRefObject } from "react";
import { BOX_HALF_H, cartesian, facingOutward, slotOf } from "./cellLayout";

type CellStageProps = {
  active: boolean;
  mode: CellMode;
  glow: string;
  showing: number | null;
  commandsRef: MutableRefObject<CellCommands | null>;
  onShowing: (index: number | null) => void;
  /** Se llama al elegir una caja con el mouse. */
  onPick: (index: number) => void;
};

/** Lo que se mueve dentro del Canvas: el brazo, las cajas y la plataforma. */
export default function CellStage({ active, mode, glow, showing, commandsRef, onShowing, onPick }: CellStageProps) {
  const { poseRef, boxRefs } = useCellController({
    count: CELL_BOXES.length,
    active,
    mode,
    onShowing,
    commandsRef,
  });

  return (
    <>
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
            label={box.label}
            glow={glow}
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
