import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { Plug } from "lucide-react";
import { OWNER } from "../../../data";
import { useTheme } from "../../../hooks/useTheme";

/**
 * Hero en teléfonos: la credencial del operario (ver docs/plan-hero-movil.md).
 *
 * Envuelve al bloque de texto del Hero (nombre, rol, métricas, botones, redes
 * y aviso del laboratorio) en una sola placa remachada, para que toda la
 * información quede agrupada y se escanee de un vistazo. La placa se "arma" al
 * abrirse el vault: aparece, se le suelda la franja de peligro, se clavan los
 * remaches y la sella "DISPONIBLE" — ese golpe es el `onDrop` que enciende el
 * nombre (el mismo contrato que el video de escritorio).
 *
 * Los hijos NO se remontan al cambiar de tema (tienen los refs del reveal de
 * GSAP): sólo se rehace la animación de la placa, con un breve "Cargando el
 * tema…" en el lugar del sello.
 */

type HeroMobileProps = {
  /** Se llama cuando el sello golpea la placa (una vez por ciclo/tema). */
  onDrop?: () => void;
  /** Se llama al montar: no hay nada que descargar. */
  onReady?: () => void;
  /** Visto bueno para arrancar (puertas del vault abiertas). Antes la placa no se ve. */
  play?: boolean;
  className?: string;
  children: ReactNode;
};

/** Lo que dura el aviso de cambio de tema (igual que el cartel de escritorio). */
const THEME_SWITCH_MS = 900;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function HeroMobile({ onDrop, onReady, play = true, className, children }: HeroMobileProps) {
  const { theme } = useTheme();
  const [switching, setSwitching] = useState(false);
  const reduced = useRef(reducedMotion()).current;

  const plateRef = useRef<HTMLDivElement>(null);
  const hazardRef = useRef<HTMLDivElement>(null);
  const weldRef = useRef<HTMLSpanElement>(null);
  const hotRef = useRef<HTMLSpanElement>(null);
  const beadRef = useRef<HTMLSpanElement>(null);
  const rivetRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const sealRef = useRef<HTMLSpanElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const droppedRef = useRef(false);
  const prevThemeRef = useRef(theme);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const fireDrop = () => {
    if (droppedRef.current) return;
    droppedRef.current = true;
    if (import.meta.env.DEV) {
      const w = window as unknown as { __heroDrops?: number };
      w.__heroDrops = (w.__heroDrops ?? 0) + 1;
    }
    onDropRef.current?.();
  };

  /** Piezas que se "arman" (todo menos la placa en sí). */
  const parts = () => ({
    rivets: rivetRefs.current.filter(Boolean),
    seal: sealRef.current,
  });

  /** Deja la placa sin armar: franja plegada, sin cordón, sin remaches ni sello. */
  const unbuild = (hidePlate: boolean) => {
    const { rivets, seal } = parts();
    if (hidePlate) gsap.set(plateRef.current, { autoAlpha: 0, y: 20 });
    gsap.set(hazardRef.current, { scaleX: 0 });
    gsap.set([weldRef.current, hotRef.current], { scaleX: 0 });
    gsap.set(hotRef.current, { opacity: 1 });
    gsap.set(beadRef.current, { opacity: 0, x: 0 });
    gsap.set(rivets, { autoAlpha: 0, scale: 2.2 });
    gsap.set(seal, { autoAlpha: 0, scale: 1.9 });
    gsap.set(sheenRef.current, { x: 0 });
  };

  /** Arma la placa. `withPlate`: también la hace aparecer (primera vez). */
  const build = (withPlate: boolean) => {
    tlRef.current?.kill();
    droppedRef.current = false;
    const { rivets, seal } = parts();
    const width = plateRef.current?.offsetWidth ?? 320;
    const tl = gsap.timeline();
    if (withPlate) tl.to(plateRef.current, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" });
    tl.to(hazardRef.current, { scaleX: 1, duration: 0.5, ease: "power2.out" }, withPlate ? 0.3 : 0)
      // Cordón: el punto al rojo recorre la unión y deja metal caliente que se enfría.
      .addLabel("weld", "<0.15")
      .to([weldRef.current, hotRef.current], { scaleX: 1, duration: 0.9, ease: "power1.inOut" }, "weld")
      .set(beadRef.current, { opacity: 1 }, "weld")
      .to(beadRef.current, { x: width, duration: 0.9, ease: "power1.inOut" }, "weld")
      .to(beadRef.current, { opacity: 0, duration: 0.2 })
      .to(hotRef.current, { opacity: 0, duration: 1.2, ease: "power1.out" }, "<")
      .to(rivets, { autoAlpha: 1, scale: 1, duration: 0.3, stagger: 0.07, ease: "back.out(2.2)" }, "<0.1")
      // El sello golpea derecho (como los sellos de las fichas: nada girado).
      .to(seal, { autoAlpha: 1, scale: 1, duration: 0.22, ease: "power4.in" }, ">-0.1")
      .call(fireDrop)
      .to(plateRef.current, { y: 2, duration: 0.06, yoyo: true, repeat: 1, ease: "power1.inOut" })
      .to(sheenRef.current, { x: width * 1.6, duration: 1.1, ease: "power2.inOut" }, "<");
    tlRef.current = tl;
    // Solo en desarrollo: las pruebas headless (render por software, ~1 fps)
    // pausan y posicionan la animación con `__heroPlateTl.pause().seek(s)`.
    if (import.meta.env.DEV) (window as unknown as { __heroPlateTl?: gsap.core.Timeline }).__heroPlateTl = tl;
  };

  // Antes del primer cuadro: la placa queda escondida hasta que se abra el vault.
  useLayoutEffect(() => {
    if (!reduced) unbuild(true);
    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!play) return;
    if (reduced) fireDrop();
    else build(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  // Cambio de tema: el reveal apaga el nombre y los botones; acá se "re-suelda"
  // la placa y se vuelve a sellar, que es lo que los vuelve a encender.
  useEffect(() => {
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    if (!play) return;
    droppedRef.current = false;
    if (reduced) {
      fireDrop();
      return;
    }
    tlRef.current?.kill();
    unbuild(false);
    setSwitching(true);
    const t = window.setTimeout(() => {
      setSwitching(false);
      build(false);
    }, THEME_SWITCH_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Remache: el mismo dibujo que `industrial/Rivets`, pero cada uno con su ref para clavarlo.
  const rivet = (i: number, pos: string) => (
    <span
      ref={(el) => (rivetRefs.current[i] = el)}
      aria-hidden
      className={`absolute h-2 w-2 rounded-full bg-gradient-to-br from-muted/70 to-border/40 shadow-[inset_0_1px_1px_rgb(var(--color-heading)/0.45)] ${pos}`}
    />
  );

  return (
    <div
      ref={plateRef}
      data-hero-mobile=""
      data-switching={switching ? "true" : "false"}
      // [&_h1]: entre 640 y 767px (plegables, tablets chicas) el `sm:text-5xl` del
      // nombre partía "Fernandez Carbonell" en dos dentro de la placa; acá se
      // limita a 2 renglones sin tocar el h1 de escritorio.
      className={`relative w-full max-w-md overflow-hidden [&_h1>br:first-of-type]:hidden [&_h1]:text-4xl rounded-xl border border-border/20 bg-surface/85 shadow-[0_18px_40px_-24px_rgb(var(--color-heading)/0.55),inset_0_1px_0_rgb(var(--color-background)/0.6)] backdrop-blur-sm ${className ?? ""}`}
    >
      {/* Franja de peligro soldada al borde de arriba. */}
      <div ref={hazardRef} aria-hidden className="hazard-stripe h-1.5 origin-left" />
      <div aria-hidden className="relative h-[3px]">
        <span ref={weldRef} className="absolute inset-0 origin-left bg-border/35" />
        <span
          ref={hotRef}
          className="absolute inset-0 origin-left bg-gradient-to-r opacity-0 from-brand-primary/30 via-brand-primary to-[#ffd27a] shadow-[0_0_8px_rgb(var(--color-brand-primary)/0.8)]"
        />
        <span
          ref={beadRef}
          className="absolute -left-1 -top-[3px] h-[9px] w-[9px] rounded-full bg-[#fff4d6] opacity-0 shadow-[0_0_10px_3px_#ffb84d]"
        />
      </div>

      {rivet(0, "left-2.5 top-[18px]")}
      {rivet(1, "right-2.5 top-[18px]")}
      {rivet(2, "bottom-2.5 left-2.5")}
      {rivet(3, "bottom-2.5 right-2.5")}

      {/* Destello que cruza el acero después del sello. */}
      <span
        ref={sheenRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-background/50 to-transparent"
      />

      {/* En teléfonos altos sobra pantalla: la placa gana aire adentro en vez
          de quedar chica en el medio de un vacío. */}
      <div className="relative px-4 pb-5 pt-4 min-[380px]:px-5 [@media(min-height:780px)]:pb-7 [@media(min-height:780px)]:pt-6">
        {/* Sello (o el aviso del cambio de tema, en el mismo lugar). Va a la
            altura de la volanta "soy", que es la primera línea de los hijos. */}
        <div className="absolute right-4 top-4 min-[380px]:right-5 [@media(min-height:780px)]:top-6">
          {/* El sello nunca se desmonta (GSAP lo anima por ref): mientras se
              cambia el tema queda invisible y encima va el aviso. */}
          <span
            ref={sealRef}
            className="flex items-center gap-1.5 rounded-md border-2 border-brand-primary/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" aria-hidden />
            {OWNER.availability}
          </span>
          {switching && (
            <span
              role="status"
              className="absolute right-0 top-0 flex items-center gap-1.5 whitespace-nowrap py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              <Plug size={14} className="animate-pulse text-brand-primary" aria-hidden />
              Conectando<span className="animate-pulse">…</span>
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Fondo del Hero en teléfono: grilla de puntos de plano técnico, con fundido. */
export function HeroMobileBackdrop() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(rgb(var(--color-muted) / 0.35) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 45%, #000 20%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 45%, #000 20%, transparent 75%)",
      }}
    />
  );
}
