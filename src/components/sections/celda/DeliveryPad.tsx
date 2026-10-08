import { useMemo } from "react";
import * as THREE from "three";
import { DELIVERY, cartesian } from "./cellLayout";

function makeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#12161a";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#d9a400";
    ctx.lineWidth = 14;
    ctx.setLineDash([46, 30]);
    ctx.strokeRect(24, 24, 464, 464);
    ctx.setLineDash([]);
    ctx.fillStyle = "#d9a400";
    ctx.font = "800 54px Sora, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ENTREGA", 256, 470);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Plataforma donde el brazo deja la caja que se está mostrando. */
export default function DeliveryPad() {
  const map = useMemo(makeTexture, []);
  const [x, , z] = cartesian(DELIVERY, 0);
  return (
    <mesh position={[x, 0.01, z]} rotation-x={-Math.PI / 2} rotation-z={DELIVERY.phi + Math.PI / 2}>
      <planeGeometry args={[0.9, 0.9]} />
      <meshStandardMaterial map={map} metalness={0.4} roughness={0.7} />
    </mesh>
  );
}
