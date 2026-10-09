import { forwardRef, useMemo, useState, type MutableRefObject } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PointLight } from "three";

import CargoBoxModel from "./CargoBoxModel";
import CellIcon from "./CellIcon";
import { CELL_ICON_PATHS, type CellIconId } from "../../../data/cellIcons";

// El modelo mide ~1,9 de lado; escalado a ~0,5 cabe entre los dedos cerrados.
export const BOX_SCALE = 0.26;

// Posición de la placa metálica en el frente (+Z) del modelo, medida del render.
const PLATE = { x: 0.12, y: -0.05, z: 0.93, w: 0.8, h: 0.5 };

/**
 * Chapa de la caja: un icono grande y brillante, en el color del tema, sobre
 * metal oscuro (sin texto: se lee a distancia y se memoriza). El mismo icono
 * aparece en el rótulo, los botones y el panel de la sección.
 */
function makePlateTexture(id: string, accent: string) {
  const W = 512;
  const H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#232a2e");
    grad.addColorStop(1, "#14181a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Cepillado del metal
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.012 + ((y * 7) % 5) * 0.004})`;
      ctx.fillRect(0, y, W, 1);
    }
    // Marco de color
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.globalAlpha = 1;
    // Icono grande con brillo
    const paths = CELL_ICON_PATHS[id as CellIconId];
    if (paths) {
      const size = 285;
      ctx.save();
      ctx.translate((W - size) / 2, (H - size) / 2);
      ctx.scale(size / 24, size / 24);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 14;
      for (const d of paths) ctx.stroke(new Path2D(d));
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

type CargoBoxProps = {
  id: string;
  label: string;
  /** Color del resplandor del piso (hover / seleccionada). */
  glow: string;
  /** Está en la plataforma de entrega (resaltada). */
  selected?: boolean;
  onSelect?: () => void;
  /** Apertura de la tapa (0 cerrada, 1 abierta); la mueve el controlador. */
  openRef: MutableRefObject<number>;
  /** Luz interior compartida (ver CargoBoxModel). */
  sharedLight?: MutableRefObject<PointLight | null>;
  position?: [number, number, number];
  rotationY?: number;
};

/**
 * Caja de carga con su placa rotulada. El origen está en el centro de la caja.
 * El controlador mueve el grupo por la ref (no por props), así que la
 * posición inicial es solo el punto de partida.
 */
const CargoBox = forwardRef<THREE.Group, CargoBoxProps>(function CargoBox(
  { id, label, glow, selected = false, onSelect, openRef, sharedLight, position, rotationY = 0 },
  ref
) {
  // El icono va en el color del tema (`glow` = color de marca del tema).
  const accent = glow;
  const texture = useMemo(() => makePlateTexture(id, accent), [id, accent]);
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
      <CargoBoxModel openRef={openRef} glow={glow} sharedLight={sharedLight} />
      {/* Rótulo legible: la placa del modelo es chica a esta distancia */}
      {!selected && (
        <Html position={[0, 1.35, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <span
            className="flex items-center gap-1.5 whitespace-nowrap rounded border bg-black/70 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur"
            style={{ borderColor: accent }}
          >
            <CellIcon id={id as CellIconId} size={12} color={accent} />
            {label}
          </span>
        </Html>
      )}
      {/* Aro de luz sobre el piso: avisa que la caja se puede elegir */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.84, 0]} visible={lit}>
        <ringGeometry args={[1.25, 1.45, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[PLATE.x, PLATE.y, PLATE.z]}>
        <planeGeometry args={[PLATE.w, PLATE.h]} />
        <meshStandardMaterial
          map={texture}
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={0.55}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
});

export default CargoBox;

