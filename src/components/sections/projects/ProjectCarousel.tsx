import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { ProjectMedia } from "../../../data/projects";
import { useCarousel } from "../../../hooks/useCarousel";

// Al salir el mouse, el carrusel vuelve a la primera captura. La espera es
// para no rebobinar de golpe si el usuario apenas pasó por encima o si está
// yendo hacia los controles "FIG." de abajo.
const RESET_DELAY_MS = 2500;

type ProjectCarouselProps = {
  media: ProjectMedia[];
  title: string;
  /** Habilita el auto-avance. En false la ficha queda en su captura actual
   *  y sólo se navega a mano. */
  autoplay?: boolean;
};

/**
 * Carrusel de media (capturas y/o videos cortos) dentro de la ficha de
 * proyecto. Crossfade (mismo patrón que AboutCarousel) con auto-avance
 * lento + navegación manual en una tira "FIG." debajo — nada superpuesto
 * sobre la media, que tiene UI real en los bordes.
 *
 * Videos: mudos, en loop, `preload="metadata"` + poster. Solo el slide
 * activo reproduce (los demás se pausan — batería/datos), y mientras un
 * video está activo el auto-avance se suspende (un clip de 10-15s no se
 * corta a los 6s; se avanza a mano). Con `prefers-reduced-motion` no hay
 * autoplay: el video muestra controles nativos y arranca solo si el
 * usuario le da play.
 *
 * Escenario (dato explícito por ítem, cero layout shift): si TODA la
 * media es portrait (grabaciones móviles 9:16), el escenario es vertical
 * con alto acotado; si no, `aspect-video`. Un ítem portrait dentro de un
 * escenario landscape se centra a altura completa (como un teléfono
 * apoyado) — preferible cargar media de una sola orientación por
 * proyecto.
 *
 * En mobile el marco rompe el padding de la ficha (full-bleed, márgenes
 * negativos que compensan el `p-6`) — la media gana ~15% de ancho y deja
 * de verse encajonada. Con una sola media no hay controles; sin media no
 * renderiza nada.
 *
 * Auto-avance: corre sólo con el mouse encima de la ficha (o el foco dentro),
 * y al salir vuelve a la primera captura pasados 2,5s. Además se suspende
 * con `prefers-reduced-motion` o si el slide actual es un video. El resto
 * del tiempo queda en la primera captura fija; la navegación manual
 * (chevrons y ticks "FIG.") siempre funciona.
 */
export default function ProjectCarousel({ media, title, autoplay = false }: ProjectCarouselProps) {
  const reduce = useReducedMotion();
  const videoRefs = useRef(new Map<number, HTMLVideoElement>());

  // El auto-avance se suspende cuando el slide activo es un video. El
  // índice "actual" se lee de la corrida anterior vía ref (el re-render
  // por cambio de índice es inmediato, así que en la práctica no hay
  // desfase): con eso se recalcula autoMs y el efecto interno de
  // useCarousel se rearma solo.
  const lastIndexRef = useRef(0);
  const activeIsVideo = media[lastIndexRef.current]?.type === "video";
  const autoMs = autoplay && !reduce && !activeIsVideo ? 6000 : 0;
  const { index, next, prev, goTo } = useCarousel(media.length, autoMs);
  lastIndexRef.current = index;

  useEffect(() => {
    if (autoplay) return;
    const id = window.setTimeout(() => goTo(0), RESET_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, goTo]);

  useEffect(() => {
    if (reduce) return;
    for (const [i, video] of videoRefs.current) {
      if (i === index) video.play().catch(() => {});
      else video.pause();
    }
  }, [index, reduce]);

  if (media.length === 0) return null;

  const allPortrait = media.every((m) => m.orientation === "portrait");
  // El escenario landscape adopta la proporción real declarada por la media
  // (`aspect` del primer ítem landscape) — capturas de browser full-screen
  // son más anchas que 16:9 y con aspect-video se recortarían los costados.
  const stageAspect =
    media.find((m) => m.orientation !== "portrait")?.aspect ?? "16 / 9";
  const stage = allPortrait
    ? "relative mx-auto aspect-[9/16] h-[420px] md:h-[480px]"
    : "relative";

  return (
    <div className="-mx-6 overflow-hidden border-y border-border/15 md:mx-0 md:rounded-sm md:border-x">
      <div
        className={stage}
        style={allPortrait ? undefined : { aspectRatio: stageAspect }}
      >
        {media.map((item, i) => {
          const portrait = item.orientation === "portrait";
          const fit =
            portrait && !allPortrait
              ? "h-full w-auto" // teléfono centrado dentro del escenario ancho
              : "h-full w-full object-cover object-top";

          return (
            <div
              key={i}
              className={`absolute inset-0 flex justify-center transition-opacity duration-500 ${
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {item.type === "video" ? (
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(i, el);
                    else videoRefs.current.delete(i);
                  }}
                  src={item.src}
                  poster={item.poster}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  controls={reduce ?? false}
                  aria-label={`Video ${i + 1} de ${title}`}
                  className={fit}
                />
              ) : (
                <img src={item.src} alt={`Captura ${i + 1} de ${title}`} className={fit} />
              )}
            </div>
          );
        })}
      </div>

      {media.length > 1 && (
        <div className="flex items-center justify-between border-t border-border/15 px-2 py-1">
          <button
            type="button"
            onClick={prev}
            aria-label="Media anterior"
            className="p-1.5 text-muted transition hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-muted">
              Fig. <span className="text-body">{String(index + 1).padStart(2, "0")}</span> /{" "}
              {String(media.length).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Ir a la media ${i + 1}`}
                  aria-current={i === index}
                  className={`h-1 w-3 transition ${
                    i === index ? "bg-brand-projects" : "bg-border/25 hover:bg-border/50"
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Media siguiente"
            className="p-1.5 text-muted transition hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
