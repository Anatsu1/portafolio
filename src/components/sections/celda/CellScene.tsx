import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import CellStage from "./CellStage";
import { ARC_RADIUS } from "./cellLayout";

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
      camera={{ position: [1.4, 3.9, 7.4], fov: 36, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0.1, 1.15, 0.6)}
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

        <CellStage active={active} />

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
