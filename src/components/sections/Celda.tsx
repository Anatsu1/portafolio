import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTheme } from "../../hooks/useTheme";
import { useInViewport } from "../../hooks/useInViewport";
import SectionHeading from "../SectionHeading";
import CellControls from "./celda/CellControls";
import SidePanel from "./celda/SidePanel";
import CellErrorBoundary from "./celda/CellErrorBoundary";
import { DEFAULT_ENV, type EnvId } from "./celda/environments";
import type { CellCommands, CellMode } from "../../hooks/useCellController";

// El chunk con three y la escena es lazy: no entra al paquete principal. En
// escritorio arranca a cargarse al abrir la página (ver `useCellPreload`), así
// que el loader del vault espera a que esté listo.
const CellScene = lazy(() => import("./celda/CellScene"));

/**
 * Celda del brazo robótico (#celda): escena 3D donde el brazo levanta cajas
 * que representan las secciones del portafolio. Es opcional: en teléfonos, sin
 * WebGL o con `prefers-reduced-motion` no se monta y el resto del sitio sigue
 * igual (el nav y los botones del Hero llegan a todo sin pasar por acá).
 */
type CeldaProps = {
  /** ¿Corresponde mostrar la celda 3D? (escritorio, WebGL, sin movimiento reducido) */
  supported: boolean;
  /** La escena cargó sus modelos y dibujó su primer cuadro. */
  onReady?: () => void;
};

export default function Celda({ supported, onReady }: CeldaProps) {
  const { theme } = useTheme();
  const { ref, visible } = useInViewport<HTMLDivElement>();
  const [env, setEnv] = useState<EnvId>(DEFAULT_ENV);
  const [mode, setMode] = useState<CellMode>("auto");
  const [showing, setShowing] = useState<number | null>(null);
  const [delivered, setDelivered] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const commandsRef = useRef<CellCommands | null>(null);
  const handleFailure = useCallback(() => {
    setFailed(true);
    onReady?.(); // que el loader del vault no espere una escena que no va a llegar
  }, [onReady]);
  const closePanel = useCallback(() => commandsRef.current?.release(), []);
  const setReading = useCallback((reading: boolean) => commandsRef.current?.holdPause(reading), []);

  // Elegir una caja (clic o botón) pasa a manual: el visitante tomó el control.
  const pick = (index: number) => {
    setMode("manual");
    commandsRef.current?.show(index);
  };

  if (!supported || failed) return null;

  return (
    <section id="celda" className="section-shell">
      <SectionHeading
        index="01"
        eyebrow="Laboratorio"
        title="Mi portafolio, en una línea de ensamblaje"
        subtitle="Cada caja es una parte de mi trabajo. Mirá cómo las mueve el brazo o tomá el control y probalo vos."
      />

      <div
        ref={ref}
        className="relative mt-10 h-[min(70vh,640px)] min-h-[420px] overflow-hidden rounded-2xl border border-border/10 bg-surface/60"
      >
        <CellErrorBoundary onError={handleFailure}>
        <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.2em] text-muted">
                Cargando celda…
              </div>
            }
          >
            <CellScene
              theme={theme}
              active={visible}
              onReady={onReady}
              env={env}
              mode={mode}
              panelOpen={delivered !== null}
              showing={showing}
              commandsRef={commandsRef}
              onShowing={setShowing}
              onDelivered={setDelivered}
              onPick={pick}
            />
        </Suspense>
        </CellErrorBoundary>
        <AnimatePresence>
          {delivered !== null && (
            <SidePanel
              key={delivered}
              index={delivered}
              auto={mode === "auto"}
              onClose={closePanel}
              onReading={setReading}
            />
          )}
        </AnimatePresence>
      </div>

      <CellControls env={env} onEnvChange={setEnv} mode={mode} onModeChange={setMode} showing={showing} onShow={pick} />

      <a
        href="#proyectos"
        className="mt-4 inline-block text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
      >
        Saltar al contenido ↓
      </a>
    </section>
  );
}
