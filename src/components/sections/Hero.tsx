import { useEffect, useRef } from "react";
import { ArrowDown, Download, Github, Linkedin, Mail } from "lucide-react";
import { OWNER } from "../../data";
import HeroArmVideo from "./hero/HeroArmVideo";
import { useHeroReveal } from "../../hooks/useHeroReveal";
import { useTheme } from "../../hooks/useTheme";

// Tope de espera por el video: si nunca avisa que está listo (conexión muy
// lenta, error), se revela la página igual pasado esto.
const VIDEO_READY_SAFETY_MS = 5000;

// pb-[0.15em]: extiende la caja del gradiente para que no recorte los
// descendentes (la "g" de Augusto) al usar bg-clip-text.
const NAME_GRADIENT =
  "inline-block translate-y-2 bg-gradient-to-r from-brand-primary to-brand-primary/70 bg-clip-text pb-[0.15em] text-transparent opacity-0";

type HeroProps = {
  /** Se llama una vez, cuando el video está listo y el reveal del texto ya
   *  arrancó — `App.tsx` la usa para apagar el `PageLoader` de toda la página. */
  onReady?: () => void;
};

export default function Hero({ onReady }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const firstNameRef = useRef<HTMLSpanElement>(null);
  const middleNameRef = useRef<HTMLSpanElement>(null);
  const lastNamesRef = useRef<HTMLSpanElement>(null);
  const restGroupRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const socialsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const readyFiredRef = useRef(false);

  const nameParts = OWNER.name.split(" ");
  const firstName = nameParts[0];
  const middleName = nameParts[1];
  const lastNames = nameParts.slice(2).join(" ");

  const { startReveal, triggerOverload } = useHeroReveal({
    sectionRef,
    eyebrowRef,
    firstNameRef,
    middleNameRef,
    lastNamesRef,
    restGroupRef,
    lightRef,
    socialsRef,
    theme,
  });

  const handleVideoReady = () => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    startReveal();
    onReady?.();
  };

  useEffect(() => {
    const safety = window.setTimeout(handleVideoReady, VIDEO_READY_SAFETY_MS);
    return () => window.clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      id="inicio"
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden border-b-2 border-border/30 pt-24 md:pt-0"
    >
      {/* Video del brazo, a pantalla completa detrás del contenido (en desktop
          el brazo "entrega" el círculo y ahí aparece el nombre). En mobile,
          en vez de mostrar el recorte estático de object-cover, HeroArmVideo
          hace zoom y sigue la pinza (ver useArmFollowCam) — si no, no se
          entiende qué hace el brazo en pantallas angostas. */}
      <div className="absolute inset-0">
        <HeroArmVideo onDrop={triggerOverload} onReady={handleVideoReady} />
      </div>

      {/* Scrim: aclara/oscurece el lado izquierdo (según tema) para que el texto
          sea legible sobre el video. En mobile es más fuerte (el texto va sobre
          el video recortado); en desktop más suave, dejando ver el brazo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent md:via-background/25"
      />

      {/* Sin mx-auto/max-w-6xl ni items-center: esos dos centran en base al
          viewport completo (ancho y alto), pero el video es full-bleed
          (100vw x 100vh, object-cover) y el cuadrado que dibuja el brazo se
          recorta en proporción al ancho de pantalla (no al alto) — por eso
          tanto la posición horizontal como la vertical del cuadrado escalan
          con vw, no con vh ni con un ancho fijo. Padding horizontal en vw +
          top en `calc(vh, vw)` replican esa misma proporción para que el
          texto quede siempre en el mismo lugar relativo al cuadrado, sea
          cual sea la resolución (antes: en pantallas grandes el texto
          quedaba desfasado a la derecha y más abajo del cuadrado). En mobile
          sigue en flujo normal (pt-24 en la section) — el video ahí usa
          cámara propia (useArmFollowCam), no este recorte estático. */}
      <div className="relative z-10 w-full px-6 md:absolute md:inset-x-0 md:top-[calc(50vh-18vw)] md:pl-[14vw] md:pr-10">
        <div className="relative max-w-xl">
          {/* Aura detrás del bloque de texto: se activa (y queda encendida,
              con un pulso suave) cuando el brazo suelta el círculo. Núcleo
              del color de fondo (blanco en claro, casi negro en oscuro) para
              disipar por completo el cuadrado+círculo que el video muestra
              ahí (se funde con el fondo real de la página), rodeado de un
              halo de energía en el color de marca. Se apaga solo al cambiar
              de tema, hasta que el video (repetido) vuelve a soltar el
              círculo (ver useHeroReveal). Expandida más allá del bloque de
              texto para cubrir bien esa zona incluso si el video se recorta
              distinto según el viewport. */}
          <div
            ref={lightRef}
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10 scale-90 opacity-0 blur-3xl"
            style={{
              background:
                "radial-gradient(55% 65% at 28% 28%, rgb(var(--color-background) / 1) 0%, rgb(var(--color-background) / 0.95) 22%, rgb(var(--color-brand-primary) / 0.55) 48%, transparent 78%)",
            }}
          />

          <p ref={eyebrowRef} className="eyebrow text-brand-primary opacity-0">
            soy
          </p>
          {/* `select-text`: el sitio entero no se selecciona (ver index.css),
              pero el nombre sí — es de lo poco que alguien va a querer
              copiar. */}
          <h1
            aria-label={OWNER.name}
            className="select-text font-display text-4xl font-extrabold leading-tight text-heading sm:text-5xl lg:text-6xl"
          >
            <span
              ref={firstNameRef}
              aria-hidden="true"
              className="inline-block translate-y-2 opacity-0"
            >
              {firstName}
            </span>
            <br />
            <span ref={middleNameRef} aria-hidden="true" className={NAME_GRADIENT}>
              {middleName}
            </span>
            <br />
            <span ref={lastNamesRef} aria-hidden="true" className={NAME_GRADIENT}>
              {lastNames}
            </span>
          </h1>

          <div ref={restGroupRef} className="translate-y-2 opacity-0">
            <p className="mt-4 max-w-xl text-lg text-body">{OWNER.role}</p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              >
                <Mail size={18} /> Contáctame
              </a>
              <a
                href={OWNER.cvUrl}
                download
                className="inline-flex items-center gap-2 rounded-xl border border-border/10 bg-background/40 px-6 py-3 font-semibold text-body backdrop-blur transition hover:border-brand-primary/60 hover:text-brand-primary"
              >
                <Download size={18} /> Descargar CV
              </a>
            </div>

            {/* Estos dos se "energizan" (parpadeo y quedan prendidos) cuando
                el brazo suelta el círculo — useHeroReveal les pone la clase
                `hero-socket-on` a los <a> de acá adentro. */}
            <div ref={socialsRef} className="mt-8 flex items-center gap-4">
              <a
                href={OWNER.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="rounded-lg border border-border/10 bg-background/40 p-2.5 text-body backdrop-blur transition hover:border-brand-primary/60 hover:text-brand-primary"
              >
                <Github size={20} />
              </a>
              <a
                href={OWNER.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="rounded-lg border border-border/10 bg-background/40 p-2.5 text-body backdrop-blur transition hover:border-brand-primary/60 hover:text-brand-primary"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#sobre-mi"
        aria-label="Ir a la sección Sobre mí"
        className="group absolute bottom-14 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-brand-primary transition hover:opacity-80"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Sobre mí
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-primary/40 bg-background/70 shadow-md shadow-heading/5 backdrop-blur transition group-hover:border-brand-primary/70 group-hover:bg-brand-primary/10">
          <ArrowDown className="animate-bounce" size={20} />
        </span>
      </a>
    </section>
  );
}
