import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import RobotArm, { type ArmPose } from "./RobotArm";
import CargoBox from "./CargoBox";
import { CELL_BOXES } from "../../../data/cell";

// Las cajas se reparten en un arco delante de la base, al alcance del brazo.
const ARC_RADIUS = 2.0;
const ARC_CENTER = -Math.PI / 2; // yaw que apunta hacia la cámara (+Z)
const ARC_SPREAD = (Math.PI * 5) / 9; // 100° en total
const BOX_HALF_H = 0.22; // la caja escalada mide ~0,44 de alto

function boxPlacement(index: number) {
  const count = CELL_BOXES.length;
  const t = count === 1 ? 0.5 : index / (count - 1);
  const yaw = ARC_CENTER - ARC_SPREAD / 2 + t * ARC_SPREAD;
  return {
    position: [ARC_RADIUS * Math.cos(yaw), BOX_HALF_H, -ARC_RADIUS * Math.sin(yaw)] as [number, number, number],
    // La placa mira a +Z en el modelo; se gira para que mire hacia afuera.
    rotationY: yaw + Math.PI / 2,
  };
}

/** Pose de reposo con un balanceo lento (la fase 2 la reemplaza por la IK). */
function IdleArm() {
  const pose = useRef<ArmPose>({ yaw: ARC_CENTER, shoulder: 0.5, elbow: -1.1, grip: 0.6 });
  const clock = useRef(0);

  useFrame((_, dt) => {
    clock.current += dt;
    const t = clock.current;
    pose.current.yaw = ARC_CENTER + Math.sin(t * 0.35) * 0.6;
    pose.current.shoulder = 0.5 + Math.sin(t * 0.5) * 0.08;
    pose.current.elbow = -1.1 + Math.sin(t * 0.7) * 0.1;
    pose.current.grip = 0.6 + Math.sin(t * 0.9) * 0.25;
  });

  return <RobotArm poseRef={pose} />;
}

type CellSceneProps = {
  theme: "light" | "dark";
  active: boolean;
};

export default function CellScene({ theme, active }: CellSceneProps) {
  const rim = theme === "dark" ? "#34d399" : "#3b82f6";

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [3.6, 3.5, 6.0], fov: 34, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(-0.2, 0.7, 0.7)}
    >
      <Suspense fallback={null}>
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
          <Lightformer form="rect" intensity={2} position={[6, 2, 4]} rotation-y={-Math.PI / 2.4} scale={[8, 4, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-6, 2, 3]} rotation-y={Math.PI / 2.4} scale={[8, 4, 1]} />
          <Lightformer form="ring" intensity={2.2} color={rim} position={[-4, 3, -5]} scale={6} />
        </Environment>

        <directionalLight position={[4, 7, 5]} intensity={1.6} />
        <directionalLight position={[-5, 3, -4]} intensity={1.4} color={rim} />

        <IdleArm />
        {CELL_BOXES.map((box, i) => {
          const { position, rotationY } = boxPlacement(i);
          return <CargoBox key={box.id} label={box.label} position={position} rotationY={rotationY} />;
        })}

        {/* Plataforma de la celda */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
          <circleGeometry args={[3.4, 64]} />
          <meshStandardMaterial color="#0e1112" metalness={0.35} roughness={0.8} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
          <ringGeometry args={[ARC_RADIUS + 0.55, ARC_RADIUS + 0.59, 96]} />
          <meshBasicMaterial color={rim} transparent opacity={0.55} />
        </mesh>

        <ContactShadows position={[0, 0.005, 0]} opacity={0.6} scale={10} blur={2.4} far={3} />
      </Suspense>
    </Canvas>
  );
}
