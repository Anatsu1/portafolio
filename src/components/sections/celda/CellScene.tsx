import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, useProgress } from "@react-three/drei";
import type { MutableRefObject } from "react";
import CellStage from "./CellStage";
import type { CellCommands, CellMode } from "../../../hooks/useCellController";
import CellEnvironment from "./CellEnvironment";
import type { EnvId } from "./environments";
import { CAMERA_POS, CAMERA_TARGET } from "./cellLayout";
import ViewShift from "./ViewShift";

type CellSceneProps = {
  /** Se llama una vez: los modelos cargaron y la escena ya dibujó sus primeros cuadros. */
  onReady?: () => void;
  theme: "light" | "dark";
  active: boolean;
  env: EnvId;
  mode: CellMode;
  panelOpen: boolean;
  showing: number | null;
  commandsRef: MutableRefObject<CellCommands | null>;
  onShowing: (index: number | null) => void;
  onDelivered: (index: number | null) => void;
  onPick: (index: number) => void;
};

/**
 * Avisa que la escena ya está lista. Vive dentro del Suspense, así que solo se
 * monta cuando los modelos terminaron de cargar; fuerza unos cuadros (con
 * `frameloop="demand"` no se dibujaría nada fuera de pantalla) para compilar
 * los shaders ahora y no en el primer scroll.
 */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    // Precompila TAMBIÉN lo que hoy está oculto (interior de las cajas, efectos):
    // si no, sus shaders se compilan recién al aparecer y se nota un tirón.
    const hidden: { visible: boolean }[] = [];
    scene.traverse((o) => {
      if (!o.visible) hidden.push(o);
      o.visible = true;
    });
    try {
      gl.compile(scene, camera);
    } finally {
      hidden.forEach((o) => (o.visible = false));
    }

    let frames = 0;
    let raf = 0;
    const tick = () => {
      invalidate();
      if (++frames < 3) raf = requestAnimationFrame(tick);
      else onReady?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Barra de carga de los modelos; vive acá para que `drei` quede en el chunk lazy. */
function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-sm">
      <p className="text-sm uppercase tracking-[0.2em] text-muted">Cargando modelos 3D</p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-border/10">
        <div className="h-full bg-brand-primary transition-[width]" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <p className="text-xs tabular-nums text-muted">{Math.round(progress)} %</p>
    </div>
  );
}

export default function CellScene({ onReady, theme, active, env, mode, panelOpen, showing, commandsRef, onShowing, onDelivered, onPick }: CellSceneProps) {
  const rim = theme === "dark" ? "#34d399" : "#3b82f6";

  return (
    <>
    <Canvas
      frameloop={active ? "always" : "demand"}
      dpr={[1, 1.75]}
      camera={{ position: [CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z], fov: 34, near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z)}
    >
      <Suspense fallback={null}>
        <CellEnvironment env={env} theme={theme} rim={rim} />
        <ViewShift open={panelOpen} />
        <ReadySignal onReady={onReady} />

        <CellStage
          active={active}
          mode={mode}
          glow={rim}
          showing={showing}
          commandsRef={commandsRef}
          onShowing={onShowing}
          onDelivered={onDelivered}
          onPick={onPick}
        />

        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={10} blur={2.4} far={3} />
      </Suspense>
    </Canvas>
    <LoadingOverlay />
    </>
  );
}
