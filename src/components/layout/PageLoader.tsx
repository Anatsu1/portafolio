import { useEffect, useRef } from "react";
import { Cog, Lock } from "lucide-react";
import { usePageLoaderExit } from "../../hooks/usePageLoaderExit";

type PageLoaderProps = {
  visible: boolean;
};

const RIVETS = Array.from({ length: 8 });

/**
 * Splash de entrada estilo puerta de refugio/vault: tapa toda la página
 * (Navbar incluido) mientras el Hero no está listo — texto revelado y video
 * con buffer suficiente para arrancar sin trabarse (ver `Hero`/`onReady`).
 * Se muestra siempre, no solo en conexiones lentas: en visitas repetidas
 * con todo cacheado dura un instante, en la primera carga sin caché lo que
 * tarde el video en bufferear.
 *
 * Dos hojas pesadas con remaches, un cerrojo central y engranajes girando
 * mientras carga; al terminar, las hojas se destraban y se abren hacia los
 * costados en vez de un fade simple (ver `usePageLoaderExit`).
 *
 * Tonos neutros (`heading`/`muted`/`border`), no colores de marca: mismo
 * look en claro/oscuro, sin adelantar la paleta de ninguna sección.
 */
export default function PageLoader({ visible }: PageLoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gearsRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const rightDoorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [visible]);

  usePageLoaderExit({ visible, rootRef, gearsRef, lockRef, leftDoorRef, rightDoorRef });

  return (
    <div ref={rootRef} aria-hidden className="fixed inset-0 z-[100] overflow-hidden">
      {/* Dos hojas pesadas — se abren hacia los costados al terminar la
          carga (ver usePageLoaderExit). Borde perimetral + remaches en el
          borde interior de cada una, para que se lean como paneles sólidos
          y no se confundan con el fondo de la página (bg-surface, no un
          degradé casi imperceptible contra bg-background). */}
      <div
        ref={leftDoorRef}
        className="absolute inset-y-0 left-0 flex w-1/2 justify-end border-b border-r border-t border-border/25 bg-surface shadow-[inset_-16px_0_30px_-20px_rgb(var(--color-heading)/0.35)]"
      >
        <div className="flex w-6 flex-col items-center justify-evenly py-10">
          {RIVETS.map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-muted/50" />
          ))}
        </div>
      </div>
      <div
        ref={rightDoorRef}
        className="absolute inset-y-0 right-0 flex w-1/2 justify-start border-b border-l border-t border-border/25 bg-surface shadow-[inset_16px_0_30px_-20px_rgb(var(--color-heading)/0.35)]"
      >
        <div className="flex w-6 flex-col items-center justify-evenly py-10">
          {RIVETS.map((_, i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-muted/50" />
          ))}
        </div>
      </div>

      {/* Cerrojo central: pulsa y desaparece justo antes de que las hojas
          se separen, como si se destrabara. */}
      <div
        ref={lockRef}
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-muted"
      >
        <Lock size={18} strokeWidth={1.5} />
      </div>

      <div
        ref={gearsRef}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5"
      >
        {/* Figuras geométricas de fondo, a la deriva — mismo motivo
            (círculo, cuadrado, triángulo) que el video del brazo. */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-[15%] top-[22%] h-10 w-10 animate-float rounded-full border-2 border-muted [animation-duration:5s]" />
          <div className="absolute right-[18%] top-[32%] h-8 w-8 rotate-12 animate-float border-2 border-muted [animation-delay:-1.5s] [animation-duration:7s]" />
          <div className="absolute left-[46%] top-[16%] h-7 w-7 rotate-45 animate-float border-2 border-muted [animation-delay:-4s] [animation-duration:6.5s]" />
          <div className="absolute bottom-[24%] left-[26%] h-0 w-0 animate-float border-x-[15px] border-b-[26px] border-x-transparent border-b-muted [animation-delay:-3s] [animation-duration:6s]" />
          <div className="absolute bottom-[30%] right-[24%] h-6 w-6 animate-float rounded-full border-2 border-muted [animation-delay:-2s] [animation-duration:8s]" />
        </div>

        <div className="relative flex h-14 w-14 items-center justify-center">
          <Cog
            className="absolute animate-[spin_4s_linear_infinite] text-heading"
            size={44}
            strokeWidth={1.5}
          />
          <Cog
            className="absolute -bottom-1 -right-1 animate-[spin_2.6s_linear_infinite_reverse] text-muted"
            size={22}
            strokeWidth={1.5}
          />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">
          Cargando<span className="animate-pulse">…</span>
        </p>
      </div>
    </div>
  );
}
