import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import type { Group } from "three";
import type { ArmPose } from "../components/sections/celda/RobotArm";
import { solveIK, type ReachTarget } from "../components/sections/celda/kinematics";
import {
  BOX_HALF_H,
  DELIVERY,
  cartesian,
  facingOutward,
  slotOf,
  type Polar,
} from "../components/sections/celda/cellLayout";

const HOVER_Y = 0.9; // altura del centro de la caja al pasar por encima de todo
const GRASP_Y = BOX_HALF_H;
const GRIP_OPEN = 1;
const GRIP_CLOSED = 0;

type Controller = {
  poseRef: MutableRefObject<ArmPose>;
  boxRefs: MutableRefObject<(Group | null)[]>;
};

/**
 * Controla el brazo y las cajas: una línea de tiempo GSAP mueve un objetivo
 * en polares y la cinemática inversa lo traduce a ángulos en cada frame. La
 * caja agarrada sigue al objetivo. Hoy solo hay modo automático (cada caja va
 * a la plataforma de entrega, espera y vuelve a su lugar); el manual y el
 * panel lateral cuelgan de este mismo hook en las fases siguientes.
 *
 * Tiene que usarse dentro de <Canvas> (usa `useFrame`).
 */
export function useCellController(count: number, active: boolean): Controller {
  const poseRef = useRef<ArmPose>({ yaw: slotOf(2).phi, shoulder: 0.5, elbow: -1.1, grip: GRIP_OPEN });
  const boxRefs = useRef<(Group | null)[]>([]);
  const reach = useRef<ReachTarget>({ ...slotOf(2), y: HOVER_Y });
  const carried = useRef<Group | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  useFrame(() => {
    solveIK(reach.current, poseRef.current);
    const box = carried.current;
    if (box) {
      const [x, y, z] = cartesian(reach.current, reach.current.y);
      box.position.set(x, y, z);
      box.rotation.y = facingOutward(reach.current.phi);
    }
  });

  useEffect(() => {
    const target = reach.current;
    const grip = poseRef.current;
    const tl = gsap.timeline({ repeat: -1, paused: true });

    const pickAndPlace = (index: number, from: Polar, to: Polar) => {
      tl.to(target, { phi: from.phi, r: from.r, y: HOVER_Y, duration: 1.3, ease: "power2.inOut" });
      tl.to(grip, { grip: GRIP_OPEN, duration: 0.4 }, "<");
      tl.to(target, { y: GRASP_Y, duration: 0.6, ease: "power2.inOut" });
      tl.to(grip, { grip: GRIP_CLOSED, duration: 0.4 });
      tl.call(() => {
        carried.current = boxRefs.current[index];
      });
      tl.to(target, { y: HOVER_Y, duration: 0.6, ease: "power2.inOut" });
      tl.to(target, { phi: to.phi, r: to.r, duration: 1.5, ease: "power2.inOut" });
      tl.to(target, { y: GRASP_Y, duration: 0.6, ease: "power2.inOut" });
      tl.to(grip, { grip: GRIP_OPEN, duration: 0.4 });
      tl.call(() => {
        carried.current = null;
      });
      tl.to(target, { y: HOVER_Y, duration: 0.5, ease: "power2.inOut" });
    };

    for (let i = 0; i < count; i++) {
      const slot = slotOf(i);
      pickAndPlace(i, slot, DELIVERY);
      tl.to({}, { duration: 1.6 }); // acá se abre el panel lateral (fase 4)
      pickAndPlace(i, DELIVERY, slot);
    }

    timeline.current = tl;
    return () => {
      tl.kill();
      timeline.current = null;
      carried.current = null;
    };
  }, [count]);

  useEffect(() => {
    timeline.current?.paused(!active);
  }, [active, count]);

  return { poseRef, boxRefs };
}
