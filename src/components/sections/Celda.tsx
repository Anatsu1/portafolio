import { lazy, Suspense } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useCellSupport } from "../../hooks/useCellSupport";
import { useInViewport } from "../../hooks/useInViewport";
import { Reveal } from "../Reveal";

// three + los modelos solo se descargan cuando la sección se acerca al viewport.
const CellScene = lazy(() => import("./celda/CellScene"));

/**
 * Celda del brazo robótico (#celda): escena 3D donde el brazo levanta cajas
 * que representan las secciones del portafolio. Es opcional: en teléfonos, sin
 * WebGL o con `prefers-reduced-motion` no se monta y el resto del sitio sigue
 * igual (el nav y los botones del Hero llegan a todo sin pasar por acá).
 */
export default function Celda() {
  const { theme } = useTheme();
  const supported = useCellSupport();
  const { ref, visible, everSeen } = useInViewport<HTMLDivElement>();

  if (!supported) return null;

  return (
    <section id="celda" className="section-shell">
      <Reveal>
        <p className="eyebrow">Celda de carga</p>
        <h2 className="section-title">Mi portafolio, en un brazo robótico</h2>
        <p className="mt-3 max-w-2xl text-body">
          Cada caja es una parte de mi trabajo. Mirá cómo las mueve el brazo
          o tomá el control.
        </p>
      </Reveal>

      <div
        ref={ref}
        className="relative mt-10 h-[min(70vh,640px)] min-h-[420px] overflow-hidden rounded-2xl border border-border/10 bg-surface/60"
      >
        {everSeen && (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.2em] text-muted">
                Cargando celda…
              </div>
            }
          >
            <CellScene theme={theme} active={visible} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
