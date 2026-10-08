import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { MutableRefObject } from "react";
import CellStage from "./CellStage";
import type { CellCommands, CellMode } from "../../../hooks/useCellController";
import CellEnvironment from "./CellEnvironment";
import type { EnvId } from "./environments";

type CellSceneProps = {
  theme: "light" | "dark";
  active: boolean;
  env: EnvId;
  mode: CellMode;
  showing: number | null;
  commandsRef: MutableRefObject<CellCommands | null>;
  onShowing: (index: number | null) => void;
  onPick: (index: number) => void;
};

export default function CellScene({ theme, active, env, mode, showing, commandsRef, onShowing, onPick }: CellSceneProps) {
  const rim = theme === "dark" ? "#34d399" : "#3b82f6";

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [1.4, 3.9, 7.4], fov: 36, near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0.1, 1.15, 0.6)}
    >
      <Suspense fallback={null}>
        <CellEnvironment env={env} theme={theme} rim={rim} />

        <CellStage
          active={active}
          mode={mode}
          glow={rim}
          showing={showing}
          commandsRef={commandsRef}
          onShowing={onShowing}
          onPick={onPick}
        />

        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={10} blur={2.4} far={3} />
      </Suspense>
    </Canvas>
  );
}
