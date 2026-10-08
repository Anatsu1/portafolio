import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";

// Ancho del panel lateral (CSS: min(420px, 42%)). Debe coincidir con SidePanel.
const PANEL_MAX_PX = 420;
const PANEL_MAX_FRAC = 0.42;

/**
 * Corre la escena hacia la izquierda cuando el panel lateral está abierto, así
 * lo que importa (el brazo y la caja en la plataforma) queda en la parte libre
 * y no tapado por el panel. Usa el desplazamiento de vista de la cámara, que
 * mueve la imagen sin tocar la posición ni el encuadre en 3D.
 */
export default function ViewShift({ open }: { open: boolean }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const amount = useRef(0);

  useFrame((_, dt) => {
    const goal = open ? 1 : 0;
    amount.current += (goal - amount.current) * Math.min(1, dt * 5);
    if (Math.abs(goal - amount.current) < 0.001) amount.current = goal;

    const panel = Math.min(PANEL_MAX_PX, size.width * PANEL_MAX_FRAC);
    const offsetX = (panel / 2) * amount.current;
    if (offsetX < 0.5) {
      if ((camera as { view?: unknown }).view) (camera as import("three").PerspectiveCamera).clearViewOffset();
    } else {
      (camera as import("three").PerspectiveCamera).setViewOffset(size.width, size.height, offsetX, 0, size.width, size.height);
    }
  });

  return null;
}
