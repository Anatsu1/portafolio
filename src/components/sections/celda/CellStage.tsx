import RobotArm from "./RobotArm";
import CargoBox from "./CargoBox";
import DeliveryPad from "./DeliveryPad";
import { CELL_BOXES } from "../../../data/cell";
import { useCellController } from "../../../hooks/useCellController";
import { BOX_HALF_H, cartesian, facingOutward, slotOf } from "./cellLayout";

/** Lo que se mueve dentro del Canvas: el brazo, las cajas y la plataforma. */
export default function CellStage({ active }: { active: boolean }) {
  const { poseRef, boxRefs } = useCellController(CELL_BOXES.length, active);

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
            position={cartesian(slot, BOX_HALF_H)}
            rotationY={facingOutward(slot.phi)}
          />
        );
      })}
    </>
  );
}
