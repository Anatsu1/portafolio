import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import type { Group } from "three";
import type { ArmPose } from "../components/sections/celda/RobotArm";
import { solveIK, type ReachTarget } from "../components/sections/celda/kinematics";
import {
  ARC_CENTER,
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
const HOME: ReachTarget = { phi: ARC_CENTER, r: 1.75, y: 0.95 };

// Cuánto se queda la caja en la plataforma antes de volver. Hasta que exista
// el panel lateral (fase 4), en manual se queda un rato más para poder mirarla.
const HOLD_AUTO_S = 1.6;
const HOLD_MANUAL_S = 4;

export type CellMode = "auto" | "manual";

/** Comandos que la interfaz (botones, clic en cajas) le manda al controlador. */
export type CellCommands = {
  /** Trae la caja `index` a la plataforma (si ya está en cola o en curso, no hace nada). */
  show: (index: number) => void;
};

type ControllerOptions = {
  count: number;
  active: boolean;
  mode: CellMode;
  /** Qué caja está mostrándose ahora (o null). */
  onShowing?: (index: number | null) => void;
  commandsRef: MutableRefObject<CellCommands | null>;
};

/**
 * Controla el brazo y las cajas. Hay una cola de "mostrar caja N": cada
 * tarea es una línea de tiempo GSAP (ir, agarrar, llevar a la plataforma,
 * esperar, devolver) que mueve un objetivo en polares; la cinemática inversa
 * lo traduce a ángulos en cada frame y la caja agarrada sigue al objetivo.
 *
 * - Modo automático: cuando la cola se vacía, sigue con la próxima caja.
 * - Modo manual: solo se mueve ante un pedido (`commands.show`); al terminar
 *   vuelve a una pose de espera.
 *
 * Tiene que usarse dentro de <Canvas> (usa `useFrame`).
 */
export function useCellController({ count, active, mode, onShowing, commandsRef }: ControllerOptions) {
  const poseRef = useRef<ArmPose>({ yaw: ARC_CENTER, shoulder: 0.5, elbow: -1.1, grip: GRIP_OPEN });
  const boxRefs = useRef<(Group | null)[]>([]);
  const reach = useRef<ReachTarget>({ ...HOME });
  const carried = useRef<Group | null>(null);

  const queue = useRef<number[]>([]);
  const current = useRef<{ index: number; tl: gsap.core.Timeline } | null>(null);
  const cursor = useRef(0);
  const live = useRef({ active, mode, count, onShowing });
  live.current = { active, mode, count, onShowing };
  const kick = useRef<(() => void) | null>(null);

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

    const pickAndPlace = (tl: gsap.core.Timeline, index: number, from: Polar, to: Polar) => {
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

    const goHome = () => {
      const tl = gsap.timeline();
      tl.to(target, { ...HOME, duration: 1.4, ease: "power2.inOut" });
      tl.to(grip, { grip: 0.6, duration: 0.4 }, "<");
      current.current = { index: -1, tl };
    };

    const next = () => {
      if (current.current && current.current.index >= 0) return; // ya hay una tarea en curso
      const { active: isActive, mode: m, count: n } = live.current;
      if (!isActive) return;

      let index = queue.current.shift();
      if (index === undefined && m === "auto") index = cursor.current++ % n;
      if (index === undefined) {
        if (!current.current) goHome();
        return;
      }

      current.current?.tl.kill();
      const slot = slotOf(index);
      const hold = m === "auto" ? HOLD_AUTO_S : HOLD_MANUAL_S;
      const tl = gsap.timeline({
        onComplete: () => {
          current.current = null;
          live.current.onShowing?.(null);
          next();
        },
      });
      pickAndPlace(tl, index, slot, DELIVERY);
      tl.to({}, { duration: hold }); // acá se abre el panel lateral (fase 4)
      pickAndPlace(tl, index, DELIVERY, slot);
      current.current = { index, tl };
      live.current.onShowing?.(index);
    };

    commandsRef.current = {
      show: (index) => {
        if (current.current?.index === index || queue.current.includes(index)) return;
        queue.current.push(index);
        // Si el brazo está en medio de otra tarea, la apura para no hacer esperar.
        if (current.current && current.current.index >= 0) current.current.tl.timeScale(2.5);
        next();
      },
    };

    kick.current = next;

    return () => {
      commandsRef.current = null;
      kick.current = null;
      current.current?.tl.kill();
      current.current = null;
      queue.current = [];
      carried.current = null;
    };
  }, [commandsRef]);

  // Pausa/reanuda al entrar o salir de pantalla, y arranca al pasar a automático.
  useEffect(() => {
    current.current?.tl.paused(!active);
    if (active) kick.current?.();
  }, [active, mode]);

  return { poseRef, boxRefs };
}
