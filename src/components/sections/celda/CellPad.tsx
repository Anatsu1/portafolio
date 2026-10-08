import { ARC_RADIUS } from "./cellLayout";

/**
 * Plataforma circular bajo el brazo y aro que marca el alcance. Es común a
 * todos los entornos: cada uno la usa con su color. El brazo y las cajas
 * están calibrados para apoyarse en y = 0.
 */
export default function CellPad({ color, ring, roughness = 0.75 }: { color: string; ring: string; roughness?: number }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.0, 0]}>
        <circleGeometry args={[3.4, 72]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={roughness} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <ringGeometry args={[ARC_RADIUS + 0.55, ARC_RADIUS + 0.59, 96]} />
        <meshBasicMaterial color={ring} transparent opacity={0.6} />
      </mesh>
    </>
  );
}
