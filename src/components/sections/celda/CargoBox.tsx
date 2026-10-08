import { forwardRef, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const BOX_URL = "/models/caja.glb";

// El modelo mide ~1,9 de lado; escalado a ~0,5 cabe entre los dedos cerrados.
export const BOX_SCALE = 0.26;

// Posición de la placa metálica en el frente (+Z) del modelo, medida del render.
const PLATE = { x: 0.12, y: -0.05, z: 0.93, w: 0.8, h: 0.5 };

function makeLabelTexture(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 320);
    grad.addColorStop(0, "#9aa0a3");
    grad.addColorStop(1, "#6e7477");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 320);
    ctx.fillStyle = "#14181a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = 120;
    ctx.font = `800 ${size}px Sora, system-ui, sans-serif`;
    while (ctx.measureText(label).width > 470 && size > 28) {
      size -= 4;
      ctx.font = `800 ${size}px Sora, system-ui, sans-serif`;
    }
    ctx.fillText(label, 256, 165);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

type CargoBoxProps = {
  label: string;
  /** Color del resplandor del piso (hover / seleccionada). */
  glow: string;
  /** Está en la plataforma de entrega (resaltada). */
  selected?: boolean;
  onSelect?: () => void;
  position?: [number, number, number];
  rotationY?: number;
};

/**
 * Caja de carga con su placa rotulada. El origen está en el centro de la caja.
 * El controlador mueve el grupo por la ref (no por props), así que la
 * posición inicial es solo el punto de partida.
 */
const CargoBox = forwardRef<THREE.Group, CargoBoxProps>(function CargoBox(
  { label, glow, selected = false, onSelect, position, rotationY = 0 },
  ref
) {
  const { scene } = useGLTF(BOX_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const texture = useMemo(() => makeLabelTexture(label), [label]);
  const [hovered, setHovered] = useState(false);
  const lit = hovered || selected;

  return (
    <group
      ref={ref}
      position={position}
      rotation-y={rotationY}
      scale={BOX_SCALE}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <primitive object={model} />
      {/* Aro de luz sobre el piso: avisa que la caja se puede elegir */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.84, 0]} visible={lit}>
        <ringGeometry args={[1.25, 1.45, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[PLATE.x, PLATE.y, PLATE.z]}>
        <planeGeometry args={[PLATE.w, PLATE.h]} />
        <meshStandardMaterial map={texture} metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  );
});

export default CargoBox;

useGLTF.preload(BOX_URL);
