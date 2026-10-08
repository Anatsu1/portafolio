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
            openRef={openRefs.current[i]}
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
