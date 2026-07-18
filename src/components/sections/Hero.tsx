import { useMemo, useRef, useState } from "react";
import { ArrowDown, Download, Github, Linkedin, Mail } from "lucide-react";
import { OWNER } from "../../data";
import RobotArmScene from "./hero/RobotArmScene";
import { useHeroAssembly } from "../../hooks/useHeroAssembly";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const travelingCircleRef = useRef<HTMLDivElement>(null);
  const middleNameLetterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const firstNameRef = useRef<HTMLSpanElement>(null);
  const lastNamesRef = useRef<HTMLSpanElement>(null);
  const restGroupRef = useRef<HTMLDivElement>(null);

  const rigWrapperRef = useRef<HTMLDivElement>(null);
  const upperArmRef = useRef<SVGGElement>(null);
  const forearmRef = useRef<SVGGElement>(null);
  const clawLeftRef = useRef<SVGGElement>(null);
  const clawRightRef = useRef<SVGGElement>(null);
  const beltSquareRef = useRef<SVGRectElement>(null);
  const beltCircleRef = useRef<SVGCircleElement>(null);
  const beltTriangleRef = useRef<SVGPolygonElement>(null);

  const isMobile = useMemo(
    () => window.matchMedia("(max-width: 767px)").matches,
    []
  );
  const [armCollapsed, setArmCollapsed] = useState(false);

  const nameParts = OWNER.name.split(" ");
  const firstName = nameParts[0];
  const middleName = nameParts[1];
  const lastNames = nameParts.slice(2).join(" ");

  useHeroAssembly({
    sectionRef,
    overlayRef,
    travelingCircleRef,
    middleNameLetterRefs,
    lastLetterIndex: middleName.length - 1,
    eyebrowRef,
    firstNameRef,
    lastNamesRef,
    restGroupRef,
    rigWrapperRef,
    upperArmRef,
    forearmRef,
    clawLeftRef,
    clawRightRef,
    beltCircleRef,
    isMobile,
    onMobileArmHidden: () => setArmCollapsed(true),
  });

  return (
    <section
      id="inicio"
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      {/* Fondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-brand-primary/20 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[380px] w-[380px] rounded-full bg-brand-primary/10 blur-[120px]"
      />

      <div className="section-shell grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p ref={eyebrowRef} className="eyebrow text-brand-primary opacity-0">
            Hola, soy
          </p>
          <h1
            aria-label={OWNER.name}
            className="font-display text-4xl font-extrabold leading-tight text-heading sm:text-5xl lg:text-6xl"
          >
            <span ref={firstNameRef} className="inline-block translate-y-2 opacity-0">
              {firstName}
            </span>
            <br />
            <span aria-hidden="true" className="inline">
              {middleName.split("").map((char, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    middleNameLetterRefs.current[i] = el;
                  }}
                  className="inline-block translate-y-2 bg-gradient-to-r from-brand-primary to-brand-primary/70 bg-clip-text text-transparent opacity-0"
                >
                  {char}
                </span>
              ))}
            </span>
            <br />
            <span
              ref={lastNamesRef}
              className="inline-block translate-y-2 bg-gradient-to-r from-brand-primary to-brand-primary/70 bg-clip-text text-transparent opacity-0"
            >
              {lastNames}
            </span>
          </h1>

          <div ref={restGroupRef} className="translate-y-2 opacity-0">
            <p className="mt-4 max-w-xl text-lg text-muted">{OWNER.role}</p>

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
                className="inline-flex items-center gap-2 rounded-xl border border-border/10 px-6 py-3 font-semibold text-body transition hover:border-brand-primary/60 hover:text-brand-primary"
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
                className="rounded-lg border border-border/10 p-2.5 text-body transition hover:border-brand-primary/60 hover:text-brand-primary"
              >
                <Github size={20} />
              </a>
              <a
                href={OWNER.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="rounded-lg border border-border/10 p-2.5 text-body transition hover:border-brand-primary/60 hover:text-brand-primary"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className={armCollapsed ? "hidden" : undefined}>
          <RobotArmScene
            isMobile={isMobile}
            rigWrapperRef={rigWrapperRef}
            upperArmRef={upperArmRef}
            forearmRef={forearmRef}
            clawLeftRef={clawLeftRef}
            clawRightRef={clawRightRef}
            beltSquareRef={beltSquareRef}
            beltCircleRef={beltCircleRef}
            beltTriangleRef={beltTriangleRef}
          />
        </div>
      </div>

      {/* Overlay para el círculo viajero (coordenadas reales de pantalla) */}
      <div ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0 z-10">
        <div
          ref={travelingCircleRef}
          className="absolute left-0 top-0 h-8 w-8 rounded-full bg-brand-primary opacity-0 md:h-10 md:w-10"
        />
      </div>

      <a
        href="#sobre-mi"
        aria-label="Ir a la sección Sobre mí"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted transition hover:text-brand-primary"
      >
        <ArrowDown className="animate-bounce" size={22} />
      </a>
    </section>
  );
}
