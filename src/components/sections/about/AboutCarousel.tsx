import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCarousel } from "../../../hooks/useCarousel";
import about1 from "../../../assets/about-1.jpg";
import about2 from "../../../assets/about-2.jpg";
import about3 from "../../../assets/about-3.jpg";

// La principal (about-1) va primera.
const IMAGES = [about1, about2, about3];

/**
 * Carrusel de fotos para la sección "Sobre mí". Crossfade entre imágenes,
 * con flechas, puntos y auto-avance (ver `useCarousel`).
 */
export default function AboutCarousel() {
  const { index, next, prev, goTo } = useCarousel(IMAGES.length);

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/10 bg-surface shadow-lg shadow-heading/5">
        {IMAGES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Cesar Fernandez — foto ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <button
          type="button"
          onClick={prev}
          aria-label="Foto anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-heading backdrop-blur transition hover:bg-background/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Foto siguiente"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-heading backdrop-blur transition hover:bg-background/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <ChevronRight size={18} />
        </button>

        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {IMAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a la foto ${i + 1}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-5 bg-brand-primary" : "w-2 bg-background/70 hover:bg-background"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
