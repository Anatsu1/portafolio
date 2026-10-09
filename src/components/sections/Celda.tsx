import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useTheme } from "../../hooks/useTheme";
import { useInViewport } from "../../hooks/useInViewport";
import SectionHeading from "../SectionHeading";
import CellControls from "./celda/CellControls";
import SidePanel from "./celda/SidePanel";
import LabSearch from "./celda/LabSearch";
import { CELL_BOXES } from "../../data/cell";
import CellErrorBoundary from "./celda/CellErrorBoundary";
import { DEFAULT_ENV, type EnvId } from "./celda/environments";
import type { CellCommands, CellMode } from "../../hooks/useCellController";

// El chunk con three y la escena es lazy: no entra al paquete principal. En
// escritorio arranca a cargarse al abrir la página (ver `useCellPreload`), así
// que el loader del vault espera a que esté listo.
const CellScene = lazy(() => import("./celda/CellScene"));
// Respaldo 2D (teléfonos, sin WebGL, movimiento reducido o si el 3D falló).
// También lazy: el escritorio con 3D nunca lo baja.
const MobileLab = lazy(() => import("./mobile/MobileLab"));

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
  // Tecnología buscada: el panel de PROYECTOS muestra solo lo que la usa (null = todo).
  const [tech, setTech] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const commandsRef = useRef<CellCommands | null>(null);
  const handleFailure = useCallback(() => {
    setFailed(true);
    onReady?.(); // que el loader del vault no espere una escena que no va a llegar
  }, [onReady]);
  const closePanel = useCallback(() => commandsRef.current?.release(), []);
  const setReading = useCallback((reading: boolean) => commandsRef.current?.holdPause(reading), []);

  // Elegir una caja (clic o botón) pasa a manual: el visitante tomó el control.
  const pick = (index: number, techId: string | null = null) => {
    setMode("manual");
    setTech(techId);
    commandsRef.current?.show(index);
  };
  const projectsIndex = CELL_BOXES.findIndex((b) => b.id === "proyectos");
  const pickTech = (nodeId: string) => pick(projectsIndex, nodeId);

  if (!supported || failed) return <LabFallback />;

  return (
    <section id="celda" className="section-shell">
      <SectionHeading
        index="01"
        eyebrow="Laboratorio"
        title="Mi portafolio, en una línea de ensamblaje"
        subtitle="Cada caja es una parte de mi trabajo. Mirá cómo las mueve el brazo o tomá el control y probalo vos."
      />

      {/* Gabinete de la máquina: marco de acero con tornillos, placa de
          identificación con luces de estado y los controles integrados abajo.
          Hace que el laboratorio se lea como UN objeto, una sección con entidad
          propia, y no como un video más dentro de la página. */}
      <div className="relative mt-10 rounded-[1.4rem] border-2 border-border/25 bg-gradient-to-b from-surface to-background p-3 shadow-[0_24px_60px_-28px_rgb(var(--color-heading)/0.45),inset_0_1px_0_rgb(var(--color-heading)/0.12)] md:p-4">
        {[
          "left-2 top-2",
          "right-2 top-2",
          "bottom-2 left-2",
          "bottom-2 right-2",
        ].map((pos) => (
          <span
            key={pos}
            aria-hidden
            className={`absolute ${pos} h-2.5 w-2.5 rounded-full bg-gradient-to-br from-muted/70 to-border/40 shadow-[inset_0_1px_1px_rgb(var(--color-heading)/0.5)]`}
          />
        ))}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgb(var(--color-brand-primary))]" />
              <span className="h-2 w-2 rounded-full bg-[#d9a400]/80" />
              <span className="h-2 w-2 rounded-full bg-muted/50" />
            </span>
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
              Unidad de laboratorio · 01
            </p>
          </div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-primary" aria-hidden />
            {mode === "auto" ? "En ciclo automático" : "Control manual"}
          </p>
        </div>
        <div aria-hidden className="hazard-stripe mx-4 mb-3 h-1.5 rounded-full" />

        <div
          ref={ref}
          className="relative h-[min(76vh,700px)] min-h-[440px] overflow-hidden rounded-xl border border-border/30 bg-surface/60 shadow-[inset_0_2px_14px_rgb(0_0_0/0.35)]"
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
                tech={tech}
                onClearTech={() => setTech(null)}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="px-1 pb-1 pt-1">
          <CellControls env={env} onEnvChange={setEnv} mode={mode} onModeChange={setMode} showing={showing} onShow={(i) => pick(i)} />
          <LabSearch onShowBox={(i) => pick(i)} onShowTech={pickTech} />
        </div>
      </div>

      <a
        href="#proyectos"
        className="mt-5 inline-block text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
      >
        Saltar al contenido ↓
      </a>
    </section>
  );
}

/**
 * Sección #celda sin 3D: mismo encabezado y un gabinete más simple (acero,
 * tornillos, franja de seguridad) con el laboratorio 2D adentro. En teléfono
 * el gabinete gana un poco de ancho sobre el padding de la sección: cada píxel
 * cuenta para que los rótulos de las cajas se lean.
 */
function LabFallback() {
  return (
    <section id="celda" className="section-shell">
      <SectionHeading
        index="01"
        eyebrow="Laboratorio"
        title="Mi portafolio, en una línea de ensamblaje"
        subtitle="Cada caja es una parte de mi trabajo. Mirá cómo las mueve el brazo o tomá el control y probalo vos."
      />
      <div className="relative -mx-3 mt-8 rounded-[1.2rem] border-2 border-border/25 bg-gradient-to-b from-surface to-background p-2 pb-3 shadow-[0_24px_60px_-28px_rgb(var(--color-heading)/0.45),inset_0_1px_0_rgb(var(--color-heading)/0.12)] md:mx-0 md:p-4">
        {["left-1.5 top-1.5", "right-1.5 top-1.5", "bottom-1.5 left-1.5", "bottom-1.5 right-1.5"].map((pos) => (
          <span
            key={pos}
            aria-hidden
            className={`absolute ${pos} h-2 w-2 rounded-full bg-gradient-to-br from-muted/70 to-border/40 shadow-[inset_0_1px_1px_rgb(var(--color-heading)/0.5)]`}
          />
        ))}
        <p className="px-3 pb-2 pt-1 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-muted">
          Unidad de laboratorio · 01
        </p>
        <div aria-hidden className="hazard-stripe mx-3 mb-2 h-1.5 rounded-full" />
        <div className="rounded-xl border border-border/30 bg-surface/60 p-1.5 shadow-[inset_0_2px_14px_rgb(0_0_0/0.25)]">
          <Suspense
            fallback={
              <div className="flex aspect-[360/380] max-h-[420px] items-center justify-center text-sm uppercase tracking-[0.2em] text-muted">
                Cargando laboratorio…
              </div>
            }
          >
            <MobileLab />
          </Suspense>
        </div>
      </div>
      <a
        href="#proyectos"
        className="mt-5 inline-block text-sm font-semibold text-brand-primary underline-offset-4 hover:underline"
      >
        Saltar al contenido ↓
      </a>
    </section>
  );
}
