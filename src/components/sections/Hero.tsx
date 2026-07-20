import { useRef } from "react";
import { ArrowDown, Download, Github, Linkedin, Mail } from "lucide-react";
import { OWNER } from "../../data";
import HeroArmVideo from "./hero/HeroArmVideo";
import { useHeroReveal } from "../../hooks/useHeroReveal";

const NAME_GRADIENT =
  "inline-block translate-y-2 bg-gradient-to-r from-brand-primary to-brand-primary/70 bg-clip-text text-transparent opacity-0";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const firstNameRef = useRef<HTMLSpanElement>(null);
  const middleNameRef = useRef<HTMLSpanElement>(null);
  const lastNamesRef = useRef<HTMLSpanElement>(null);
  const restGroupRef = useRef<HTMLDivElement>(null);

  const nameParts = OWNER.name.split(" ");
  const firstName = nameParts[0];
  const middleName = nameParts[1];
  const lastNames = nameParts.slice(2).join(" ");

  const { startReveal } = useHeroReveal({
    sectionRef,
    eyebrowRef,
    firstNameRef,
    middleNameRef,
    lastNamesRef,
    restGroupRef,
  });

  return (
    <section
      id="inicio"
      ref={sectionRef}
      className="relative flex min-h-screen items-start overflow-hidden border-b-2 border-border/30 pt-24 md:items-center md:pt-0"
    >
      {/* Video del brazo, a pantalla completa detrás del contenido (en desktop
          el brazo "entrega" el círculo y ahí aparece el nombre). En mobile se
          usa igual de fondo — se ve parcial (recortado), es a propósito. */}
      <div className="absolute inset-0">
        <HeroArmVideo onDrop={startReveal} />
      </div>

      {/* Scrim: aclara/oscurece el lado izquierdo (según tema) para que el texto
          sea legible sobre el video. En mobile es más fuerte (el texto va sobre
          el video recortado); en desktop más suave, dejando ver el brazo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent md:via-background/25"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="max-w-xl">
          <p ref={eyebrowRef} className="eyebrow text-brand-primary opacity-0">
            soy
          </p>
          <h1
            aria-label={OWNER.name}
            className="font-display text-4xl font-extrabold leading-tight text-heading sm:text-5xl lg:text-6xl"
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

            <div className="mt-8 flex items-center gap-4">
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
        className="group absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted transition hover:text-brand-primary md:flex"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
          Sobre mí
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/20 bg-background/50 backdrop-blur transition group-hover:border-brand-primary/60 group-hover:bg-brand-primary/10">
          <ArrowDown className="animate-bounce" size={18} />
        </span>
      </a>
    </section>
  );
}
