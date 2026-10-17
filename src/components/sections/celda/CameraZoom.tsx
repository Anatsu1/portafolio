import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import { Vector3 } from "three";
import { CAMERA_POS, CAMERA_TARGET } from "./cellLayout";

// Encuadre cercano para cuando el brazo va por una caja del estante trasero:
// la cámara se acerca y apunta hacia el fondo, donde está el brazo trabajando.
const ZOOM_POS = { x: 0.9, y: 3.0, z: 4.7 };
const ZOOM_TARGET = { x: 0.1, y: 1.2, z: -0.9 };

/**
 * Acerca la cámara (y la vuelve a su lugar) siguiendo `zoomRef` (0..1), que
 * escribe el controlador del brazo. Cambia posición y objetivo; el corrimiento
 * lateral del panel (ViewShift) usa el desplazamiento de vista y no interfiere.
 */
export default function CameraZoom({ zoomRef }: { zoomRef: MutableRefObject<number> }) {
  const camera = useThree((s) => s.camera);
  const amount = useRef(0);
  const look = useRef(new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z));

  useFrame((_, dt) => {
    const goal = zoomRef.current;
    if (amount.current === goal && goal === 0) return;
    amount.current += (goal - amount.current) * Math.min(1, dt * 2.6);
    if (Math.abs(goal - amount.current) < 0.002) amount.current = goal;
    const t = amount.current;
    const e = t * t * (3 - 2 * t); // smoothstep
    camera.position.set(
      CAMERA_POS.x + (ZOOM_POS.x - CAMERA_POS.x) * e,
      CAMERA_POS.y + (ZOOM_POS.y - CAMERA_POS.y) * e,
      CAMERA_POS.z + (ZOOM_POS.z - CAMERA_POS.z) * e
    );
    look.current.set(
      CAMERA_TARGET.x + (ZOOM_TARGET.x - CAMERA_TARGET.x) * e,
      CAMERA_TARGET.y + (ZOOM_TARGET.y - CAMERA_TARGET.y) * e,
      CAMERA_TARGET.z + (ZOOM_TARGET.z - CAMERA_TARGET.z) * e
    );
    camera.lookAt(look.current);
  });

  return null;
}
