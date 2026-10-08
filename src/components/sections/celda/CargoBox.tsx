import { useMemo } from "react";
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
  position?: [number, number, number];
  rotationY?: number;
};

/** Caja de carga con su placa rotulada. El origen está en el centro de la caja. */
export default function CargoBox({ label, position, rotationY = 0 }: CargoBoxProps) {
  const { scene } = useGLTF(BOX_URL);
  const model = useMemo(() => scene.clone(true), [scene]);
  const texture = useMemo(() => makeLabelTexture(label), [label]);

  return (
    <group position={position} rotation-y={rotationY} scale={BOX_SCALE}>
      <primitive object={model} />
      <mesh position={[PLATE.x, PLATE.y, PLATE.z]}>
        <planeGeometry args={[PLATE.w, PLATE.h]} />
        <meshStandardMaterial map={texture} metalness={0.6} roughness={0.45} />
      </mesh>
    </group>
  );
}

useGLTF.preload(BOX_URL);
