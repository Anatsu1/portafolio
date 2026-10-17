import { useEffect, useRef, useState } from "react";
import { ArrowDown, Download, Github, Linkedin, Mail } from "lucide-react";
import { OWNER } from "../../data";
import HeroArmVideo from "./hero/HeroArmVideo";
import HeroMobile, { HeroMobileBackdrop } from "./hero/HeroMobile";
import HeroStats from "./hero/HeroStats";
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
  /** Se llama una vez, cuando el video ya tiene buffer para reproducir (en
   *  teléfono, al montar la credencial) — `App.tsx` la usa (junto con la carga
   *  de los modelos 3D) para abrir el `PageLoader`. */
  onReady?: () => void;
  /** Visto bueno para arrancar: cuando se abren las puertas del vault empiezan el
   *  video del brazo (o el armado de la credencial) y el reveal del texto. */
  go?: boolean;
  /** ¿Hay laboratorio (3D en escritorio o 2D en teléfono)? Muestra el aviso que lleva a él. */
  labAvailable?: boolean;
};

export default function Hero({ onReady, go = true, labAvailable = false }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const firstNameRef = useRef<HTMLSpanElement>(null);
  const middleNameRef = useRef<HTMLSpanElement>(null);
  const lastNamesRef = useRef<HTMLSpanElement>(null);
  const restGroupRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const socialsRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  // Teléfono = por ANCHO: en vertical el video 16:9 no se entiende y el Hero
  // pasa a ser la credencial (HeroMobile). Un teléfono apaisado es ancho y
  // sigue con el video. Se mide una vez al montar.
  const [isPhone] = useState(() => window.matchMedia("(max-width: 767px)").matches);
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
    onReady?.();
  };

  // El reveal del texto arranca junto con el video, al abrirse el vault.
  useEffect(() => {
    if (go) startReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go]);

  useEffect(() => {
    const safety = window.setTimeout(handleVideoReady, VIDEO_READY_SAFETY_MS);
    return () => window.clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El bloque de texto es UNO solo para los dos layouts (los refs del reveal
  // de GSAP apuntan a estos nodos): en escritorio va suelto sobre el video y
  // en teléfono adentro de la credencial. Las clases base son las del
  // teléfono y las `md:` devuelven las de escritorio.
  const textBlock = (
    <>
      {/* Aura detrás del bloque de texto: se activa (y queda encendida,
          con un pulso suave) cuando el brazo suelta el círculo (en teléfono,
          cuando el sello golpea la credencial). Núcleo del color de fondo
          (blanco en claro, casi negro en oscuro) para disipar por completo
          el cuadrado+círculo que el video muestra ahí (se funde con el fondo
          real de la página), rodeado de un halo de energía en el color de
          marca. Se apaga solo al cambiar de tema, hasta que se vuelve a
          soltar el círculo (ver useHeroReveal). Expandida más allá del
          bloque de texto para cubrir bien esa zona incluso si el video se
          recorta distinto según el viewport. */}
      <div
        ref={lightRef}
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10 scale-90 opacity-0 blur-3xl"
        style={{
          // En teléfono no hay cuadrado del video que tapar: el halo es más tenue.
          background: isPhone
            ? "radial-gradient(55% 65% at 28% 28%, rgb(var(--color-background) / 0.6) 0%, rgb(var(--color-background) / 0.4) 22%, rgb(var(--color-brand-primary) / 0.12) 48%, transparent 78%)"
            : "radial-gradient(55% 65% at 28% 28%, rgb(var(--color-background) / 1) 0%, rgb(var(--color-background) / 0.95) 22%, rgb(var(--color-brand-primary) / 0.55) 48%, transparent 78%)",
        }}
      />

      <p ref={eyebrowRef} className="eyebrow mb-1.5 text-brand-primary opacity-0 md:mb-3">
        soy
      </p>
      {/* `select-text`: el sitio entero no se selecciona (ver index.css),
          pero el nombre sí — es de lo poco que alguien va a querer
          copiar. */}
      <h1
        aria-label={OWNER.name}
        className="select-text font-display text-[1.7rem] font-extrabold leading-tight text-heading sm:text-5xl lg:text-6xl"
      >
        <span
          ref={firstNameRef}
          aria-hidden="true"
          className="inline-block translate-y-2 opacity-0"
        >
          {firstName}
        </span>
        {" "}
        {/* El corte en 2 renglones es condicional: en mobile el nombre en
            4 renglones se comía casi medio viewport. */}
        <br className="hidden sm:inline" />
        <span ref={middleNameRef} aria-hidden="true" className={NAME_GRADIENT}>
          {middleName}
        </span>
        <br />
        <span ref={lastNamesRef} aria-hidden="true" className={NAME_GRADIENT}>
          {lastNames}
        </span>
      </h1>

      <div ref={restGroupRef} className="translate-y-2 opacity-0">
        <p className="mt-3 max-w-xl text-lg text-body md:mt-4">{OWNER.role}</p>
        {/* El gancho comercial va en el color de marca y en el mismo
            lenguaje que la volanta "soy": encierra al nombre entre dos
            líneas cortas y no compite con el rol de arriba. */}
        <p className="mt-1.5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary md:mt-1">
          {OWNER.tagline}
        </p>

        <HeroStats />

        {/* En teléfono los dos botones van lado a lado y más chicos (apilados
            empujaban todo fuera del pliegue); `px-3` para que "Descargar CV"
            entre a 360px dentro de la credencial. */}
        <div className="mt-4 flex items-stretch gap-3 md:mt-8 md:flex-wrap md:items-center md:gap-4">
          <a
            href="#contacto"
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-primary px-3 py-3 text-sm font-semibold text-on-brand transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary md:flex-none md:px-6 md:text-base"
          >
            <Mail size={18} /> Contáctame
          </a>
          <a
            href={OWNER.cvUrl}
            download
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border/10 bg-background/40 px-3 py-3 text-sm font-semibold text-body backdrop-blur transition hover:border-brand-primary/60 hover:text-brand-primary md:flex-none md:px-6 md:text-base"
          >
            <Download size={18} /> Descargar CV
          </a>
        </div>

        {/* En teléfono redes + aviso del laboratorio comparten renglón (es la
            última fila de la credencial); en escritorio vuelven a apilarse. */}
        <div className="mt-3 flex items-center gap-3 md:mt-0 md:block">
          {/* Estos dos se "energizan" (parpadeo y quedan prendidos) cuando
              el brazo suelta el círculo — useHeroReveal les pone la clase
              `hero-socket-on` a los <a> de acá adentro. */}
          <div ref={socialsRef} className="flex shrink-0 items-center gap-3 md:mt-8 md:gap-4">
            <a
              href={OWNER.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="rounded-lg border border-border/10 bg-background/40 p-3 text-body backdrop-blur transition hover:border-brand-primary/60 hover:text-brand-primary md:p-2.5"
            >
              <Github size={20} />
            </a>
            <a
              href={OWNER.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="rounded-lg border border-border/10 bg-background/40 p-3 text-body backdrop-blur transition hover:border-brand-primary/60 hover:text-brand-primary md:p-2.5"
            >
              <Linkedin size={20} />
            </a>
          </div>

          {/* Aviso del laboratorio: el 3D interactivo vive más abajo y el Hero lo anuncia. */}
          {labAvailable && (
            <a
              href="#celda"
              className="group inline-flex min-h-[46px] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-brand-primary/30 bg-background/40 px-3 py-2 text-sm font-semibold text-body backdrop-blur transition hover:border-brand-primary/70 hover:text-brand-primary md:mt-5 md:min-h-0 md:flex-none md:justify-start md:gap-2.5 md:px-3.5"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
              </span>
              {/* En la credencial queda poco ancho al lado de las redes (~115px de texto a 360). */}
              <span className="truncate md:hidden">Probá el brazo</span>
              <span className="hidden md:inline">Probá el laboratorio: tomá el control del brazo</span>
              <ArrowDown size={14} className="shrink-0 transition group-hover:translate-y-0.5" />
            </a>
          )}
        </div>
      </div>
    </>
  );

  // min-h-[100svh] en vez de min-h-screen: en Chrome de Android `100vh`
  // mide contra la barra de direcciones desplegada, así que al scrollear
  // el alto cambia y el bloque salta. svh usa el viewport chico y no se mueve.
  return (
    <section
      id="inicio"
      ref={sectionRef}
      className="relative flex min-h-[100svh] flex-col overflow-hidden border-b-2 border-border/30 pt-20 md:block md:pt-0"
    >
      {/* Fondo. Escritorio: el video del brazo a pantalla completa (el brazo
          "entrega" el círculo y ahí se enciende el nombre). Teléfono: sin
          brazo — sólo una grilla tenue de plano técnico; el protagonista es
          la credencial. Render condicional y no CSS: el teléfono no baja el
          mp4. */}
      <div className="absolute inset-0">
        {isPhone ? (
          <HeroMobileBackdrop />
        ) : (
          <HeroArmVideo onDrop={triggerOverload} onReady={handleVideoReady} play={go} />
        )}
      </div>

      {/* Scrim: aclara/oscurece el video (según tema) para que el texto sea
          legible. Sólo hace falta con video. El sentido cambia con la
          orientación porque cambia dónde está el texto: de arriba hacia
          abajo en un teléfono apaisado (texto a todo el ancho) y de
          izquierda a derecha en escritorio (texto a la izquierda), más
          suave, dejando ver el brazo. */}
      {!isPhone && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/90 to-transparent md:bg-gradient-to-r md:via-background/25"
        />
      )}

      {/* Escritorio — sin mx-auto/max-w-6xl ni items-center: esos dos centran
          en base al viewport completo (ancho y alto), pero el video es
          full-bleed (100vw x 100vh, object-cover) y el cuadrado que dibuja el
          brazo se recorta en proporción al ancho de pantalla (no al alto) —
          por eso tanto la posición horizontal como la vertical del cuadrado
          escalan con vw. Padding horizontal en vw + top en `calc(vh, vw)`
          replican esa misma proporción para que el texto quede siempre en el
          mismo lugar relativo al cuadrado, sea cual sea la resolución.

          Teléfono — `flex-1 items-center` centra la credencial en el alto que
          queda debajo del nav (con flex y no con paddings a mano: los altos
          van de 568 a 930+). El `pb` reserva la flecha "Sobre mí", que así
          nunca pisa la placa (más chico en pantallas bajas, donde la flecha
          va sin rótulo). Un teléfono apaisado sigue con el video y el `pb-32`
          de siempre. Medido en 360×568, 360×640, 390×844 y
          412×915: la credencial entra entera arriba del pliegue. */}
      <div className={`relative z-10 flex w-full flex-1 items-center px-4 ${isPhone ? "pb-16 [@media(min-height:701px)]:pb-20" : "pb-32"} md:absolute md:block md:inset-x-0 md:top-[calc(50vh-18vw)] md:pb-0 md:pl-[14vw] md:pr-10`}>
        {isPhone ? (
          <HeroMobile onDrop={triggerOverload} onReady={handleVideoReady} play={go} className="mx-auto">
            {textBlock}
          </HeroMobile>
        ) : (
          <div className="relative w-full max-w-xl md:w-auto">{textBlock}</div>
        )}
      </div>

      <a
        href="#sobre-mi"
        aria-label="Ir a la sección Sobre mí"
        className="group absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-brand-primary transition hover:opacity-80 md:bottom-14"
      >
        {/* En teléfonos bajos el rótulo no entra debajo de la credencial: queda la flecha. */}
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-muted ${isPhone ? "[@media(max-height:700px)]:hidden" : ""}`}
        >
          Sobre mí
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-primary/40 bg-background/70 shadow-md shadow-heading/5 backdrop-blur transition group-hover:border-brand-primary/70 group-hover:bg-brand-primary/10">
          <ArrowDown className="animate-bounce" size={20} />
        </span>
      </a>
    </section>
  );
}
