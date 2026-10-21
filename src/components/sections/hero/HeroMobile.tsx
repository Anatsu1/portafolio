import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { useTheme } from "../../../hooks/useTheme";

type HeroMobileProps = {
  /** Se llama cuando encastra la última pieza (una vez por ciclo/tema). */
  onDrop?: () => void;
  /** Se llama al montar: no hay nada que descargar. */
  onReady?: () => void;
  /** Visto bueno para arrancar (puertas del vault abiertas). */
  play?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Hero móvil: "línea de ensamblaje".
 *
 * Combina la pantalla de mando de V1 (escuadras, cabecera mono, regla) con el
 * brazo de plano técnico de V4: el panel no aparece, lo ARMAN cuatro brazos
 * que entran alternando lados, cada uno con una pieza fantasma (contorno
 * punteado con su lengüeta de agarre) del tamaño exacto de la zona real:
 *
 *   PZ-01 cabecera + regla  → al encastrar, traban las escuadras (marco)
 *   PZ-02 volanta + nombre
 *   PZ-03 rol + gancho + métricas
 *   PZ-04 botones + redes   → su encastre es el `onDrop` (nombre y botones)
 *
 * Cada pieza llega, baja con un golpe seco, el contenido real se enciende
 * debajo del fantasma, la garra suelta y el brazo se retira fuera de cuadro.
 *
 * Los hijos (bloque de texto con los refs del reveal) son UN árbol que no se
 * toca: se mide con offsetTop (ignora transforms) y se oculta por zonas. La
 * volanta y los <span> del nombre son de useHeroReveal (opacity/y): acá sólo
 * se toca `visibility` de la volanta, y `opacity` del h1 y de los hijos del
 * grupo de abajo (nunca overwrite sobre nodos del reveal).
 *
 * Todo lo visual va dentro de UNA timeline (seekable); sólo `fireDrop` es
 * `.call`. Al cambiar de tema el panel se desarma y se vuelve a armar.
 */

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Reloj del pie (componente propio: su tic no re-renderiza el panel). */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time dateTime={now.toISOString()} className="tabular-nums">
      {now.toLocaleTimeString("es-AR", { hour12: false, timeZone: "America/Argentina/Buenos_Aires" })}
    </time>
  );
}

const CORNERS = [
  { pos: "left-0 top-0 border-l-2 border-t-2", from: { x: -18, y: -18 } },
  { pos: "right-0 top-0 border-r-2 border-t-2", from: { x: 18, y: -18 } },
  { pos: "bottom-0 left-0 border-b-2 border-l-2", from: { x: -18, y: 18 } },
  { pos: "bottom-0 right-0 border-b-2 border-r-2", from: { x: 18, y: 18 } },
] as const;

/** Piezas: de qué lado entra el brazo y dónde agarra (fracción del ancho). */
const PIECES = [
  { label: "PZ-01 · Cabecera", side: "left", grip: 0.3 },
  { label: "PZ-02 · Nombre", side: "right", grip: 0.68 },
  { label: "PZ-03 · Perfil", side: "left", grip: 0.32 },
  { label: "PZ-04 · Contacto", side: "right", grip: 0.7 },
] as const;

// Ritmo: una pieza cada STEP s; cada una tarda IN en llegar y SLAM en golpear.
const STEP = 0.6;
const IN = 0.48;
const SLAM = 0.13;

/**
 * Brazo de plano técnico, dibujado con la punta de la garra en (0,0) y el
 * cuerpo hacia arriba a la izquierda (el espejo lo da el contenedor).
 * Coordenadas en px, sin escalar.
 */
const SH = { x: -178, y: -44 }; // hombro
const EL = { x: -76, y: -88 }; // codo
const WR = { x: 0, y: -27 }; // muñeca

function Link({ a, b, w }: { a: { x: number; y: number }; b: { x: number; y: number }; w: number }) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return (
    <g transform={`translate(${a.x} ${a.y}) rotate(${ang})`}>
      <rect x={0} y={-w / 2} width={len} height={w} rx={w / 2} className="fill-background stroke-brand-primary" strokeWidth={1.2} />
      <line x1={w} y1={0} x2={len - w} y2={0} className="stroke-brand-primary" strokeWidth={0.5} strokeDasharray="6 3 1.5 3" opacity={0.7} />
    </g>
  );
}

type ArmRefs = { arm: SVGGElement | null; fl: SVGGElement | null; fr: SVGGElement | null };

function ArmSvg({ refs }: { refs: ArmRefs }) {
  const line = "fill-none stroke-brand-primary";
  const body = "fill-background stroke-brand-primary";
  return (
    <svg
      aria-hidden
      width={300}
      height={140}
      viewBox="-280 -120 300 140"
      className="absolute left-[-280px] top-[-120px] overflow-visible"
    >
      <g ref={(el) => (refs.arm = el)}>
        {/* Riel del carro, que sigue fuera de cuadro. */}
        <path d={`M${SH.x - 400} ${SH.y - 14} H${SH.x + 14}`} className={line} strokeWidth={0.8} strokeDasharray="10 4 2 4" opacity={0.6} />
        <rect x={SH.x - 16} y={SH.y - 20} width={32} height={9} className={body} strokeWidth={1.1} />
        <path d={`M${SH.x - 13} ${SH.y - 11} l4 -9 M${SH.x - 5} ${SH.y - 11} l4 -9 M${SH.x + 3} ${SH.y - 11} l4 -9`} className={line} strokeWidth={0.6} opacity={0.7} />

        <Link a={SH} b={EL} w={11} />
        <Link a={EL} b={WR} w={8} />

        {/* Garra: palma + dos dedos que abrazan la lengüeta de la pieza. */}
        <rect x={-2.5} y={WR.y} width={5} height={8} className={body} strokeWidth={1} />
        <rect x={-14} y={-19} width={28} height={5} rx={1} className={body} strokeWidth={1.1} />
        <g ref={(el) => (refs.fl = el)}>
          <path d="M-11 -14 v12 l3 3" className={line} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g ref={(el) => (refs.fr = el)}>
          <path d="M11 -14 v12 l-3 3" className={line} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <circle cx={WR.x} cy={WR.y} r={4.5} className={body} strokeWidth={1.1} />
        <circle cx={EL.x} cy={EL.y} r={7.5} className={body} strokeWidth={1.2} />
        <circle cx={EL.x} cy={EL.y} r={1.8} className="fill-brand-primary" />
        <circle cx={SH.x} cy={SH.y} r={10.5} className={body} strokeWidth={1.3} />
        <circle cx={SH.x} cy={SH.y} r={3.5} className={line} strokeWidth={1} />
        <path d={`M${SH.x - 15} ${SH.y} h30 M${SH.x} ${SH.y - 15} v30`} className={line} strokeWidth={0.5} opacity={0.6} />
      </g>
    </svg>
  );
}

type PieceRefs = {
  carrier: HTMLDivElement | null;
  ghost: HTMLDivElement | null;
  solid: HTMLDivElement | null;
  anchor: HTMLDivElement | null;
  tab: HTMLSpanElement | null;
  arm: ArmRefs;
};

export default function HeroMobile({ onDrop, onReady, play = true, className, children }: HeroMobileProps) {
  const { theme } = useTheme();
  const reduced = useRef(reducedMotion()).current;

  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cornerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const headRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  // Activación del contorno (al encastrar la última pieza).
  const edgeRef = useRef<HTMLDivElement>(null);
  const glowCornerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const sweepRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pulseRef = useRef<gsap.core.Tween | null>(null);
  const bootLabelRef = useRef<HTMLSpanElement>(null);
  const liveLabelRef = useRef<HTMLSpanElement>(null);
  const liveDotRef = useRef<HTMLSpanElement>(null);
  const pieceRefs = useRef<PieceRefs[]>(
    PIECES.map(() => ({ carrier: null, ghost: null, solid: null, anchor: null, tab: null, arm: { arm: null, fl: null, fr: null } }))
  );
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const runRef = useRef(0);
  const droppedRef = useRef(false);
  const prevThemeRef = useRef(theme);
  const [recal, setRecal] = useState(false);
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

  const corners = () => cornerRefs.current.filter(Boolean) as HTMLSpanElement[];
  const glowCorners = () => glowCornerRefs.current.filter(Boolean) as HTMLSpanElement[];

  /** Contorno apagado (antes de armar). */
  const edgesOff = () => {
    pulseRef.current?.kill();
    pulseRef.current = null;
    gsap.set([edgeRef.current, ...glowCorners()], { autoAlpha: 0, scale: 1 });
    gsap.set(sweepRefs.current, { autoAlpha: 0, xPercent: 0, yPercent: 0 });
  };

  /** Latido suave del contorno encendido (fuera de la timeline: es infinito). */
  const startPulse = () => {
    pulseRef.current?.kill();
    pulseRef.current = gsap.to([edgeRef.current, ...glowCorners()], {
      opacity: 0.45,
      duration: 1.8,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  };

  /** Zonas del contenido real (nodos de los hijos, sin remontarlos). */
  const zones = () => {
    const root = contentRef.current;
    const eyebrow = root?.querySelector<HTMLElement>(".eyebrow") ?? null;
    const h1 = root?.querySelector<HTMLElement>("h1") ?? null;
    const rest = Array.from((h1?.nextElementSibling?.children ?? []) as HTMLCollectionOf<HTMLElement>);
    return {
      eyebrow,
      h1,
      groups: [
        [headRef.current, rulerRef.current],
        [eyebrow, h1],
        rest.slice(0, 3),
        rest.slice(3),
      ].map((g) => g.filter(Boolean) as HTMLElement[]),
    };
  };

  /** Posición dentro del panel sin transforms (offsetTop encadenado). */
  const offsetIn = (el: HTMLElement) => {
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== frameRef.current) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  /** Coloca cada carro (fantasma + brazo) exactamente sobre su zona. */
  const measure = () => {
    const { groups } = zones();
    groups.forEach((g, i) => {
      const p = pieceRefs.current[i];
      if (!g.length || !p.carrier || !p.anchor) return;
      const r = g.map(offsetIn);
      const top = Math.min(...r.map((b) => b.y)) - 4;
      const bottom = Math.max(...r.map((b) => b.y + b.h)) + 4;
      const left = Math.min(...r.map((b) => b.x)) - 6;
      const right = Math.max(...r.map((b) => b.x + b.w)) + 6;
      Object.assign(p.carrier.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
      p.anchor.style.left = `${Math.round((right - left) * PIECES[i].grip)}px`;
    });
  };

  /** Contenido apagado y piezas fuera de cuadro (antes de armar). */
  const disassemble = () => {
    const { eyebrow, h1, groups } = zones();
    const W = window.innerWidth;
    corners().forEach((el, i) => gsap.set(el, { ...CORNERS[i].from, autoAlpha: 0 }));
    gsap.set([headRef.current, footRef.current], { autoAlpha: 0 });
    edgesOff();
    gsap.set(rulerRef.current, { scaleX: 0 });
    if (eyebrow) gsap.set(eyebrow, { visibility: "hidden" });
    gsap.set([h1, ...groups[2], ...groups[3]].filter(Boolean), { opacity: 0 });
    gsap.set(bootLabelRef.current, { autoAlpha: 1 });
    gsap.set([liveLabelRef.current, liveDotRef.current], { autoAlpha: 0 });
    pieceRefs.current.forEach((p, i) => {
      const dir = PIECES[i].side === "left" ? -1 : 1;
      gsap.set(p.carrier, { autoAlpha: 0, x: dir * W, y: -48 });
      gsap.set([p.ghost, p.tab], { autoAlpha: 1 });
      gsap.set(p.solid, { autoAlpha: 0 });
      gsap.set(p.arm.arm, { x: 0, y: 0, rotation: 0, svgOrigin: `${SH.x} ${SH.y}` });
      gsap.set(p.arm.fl, { rotation: 0, svgOrigin: "-11 -14" });
      gsap.set(p.arm.fr, { rotation: 0, svgOrigin: "11 -14" });
    });
  };

  /** Estado final sin animación (movimiento reducido). */
  const setFinal = () => {
    const { eyebrow, h1, groups } = zones();
    gsap.set(corners(), { x: 0, y: 0, autoAlpha: 1 });
    gsap.set([headRef.current, footRef.current], { autoAlpha: 1 });
    // Movimiento reducido: contorno encendido, sin destello ni latido.
    gsap.set([edgeRef.current, ...glowCorners()], { autoAlpha: 0.85 });
    gsap.set(rulerRef.current, { scaleX: 1 });
    if (eyebrow) gsap.set(eyebrow, { visibility: "visible" });
    gsap.set([h1, ...groups[2], ...groups[3]].filter(Boolean), { opacity: 1 });
    gsap.set(bootLabelRef.current, { autoAlpha: 0 });
    gsap.set([liveLabelRef.current, liveDotRef.current], { autoAlpha: 1 });
    pieceRefs.current.forEach((p) => gsap.set(p.carrier, { autoAlpha: 0 }));
  };

  /** Arma el panel: una timeline, cuatro brazos. */
  const assemble = async () => {
    const run = ++runRef.current;
    tlRef.current?.kill();
    droppedRef.current = false;
    disassemble();
    await document.fonts.ready;
    if (run !== runRef.current) return; // StrictMode / cambio de tema: otra corrida tomó el control
    measure();

    const { eyebrow, h1, groups } = zones();
    const W = window.innerWidth;
    const tl = gsap.timeline({ onComplete: () => setRecal(false) });

    pieceRefs.current.forEach((p, i) => {
      const t0 = i * STEP;
      const land = t0 + IN + SLAM;
      // Llega en diagonal desde su lado, sostenida por la garra…
      tl.set(p.carrier, { autoAlpha: 1 }, t0)
        .to(p.carrier, { x: 0, y: -12, duration: IN, ease: "power3.out" }, t0)
        // …y baja de golpe: encastra.
        .to(p.carrier, { y: 0, duration: SLAM, ease: "power4.in" }, t0 + IN)
        .to(p.solid, { autoAlpha: 1, duration: 0.06 }, land)
        .to(frameRef.current, { y: 2, duration: 0.05, yoyo: true, repeat: 1, ease: "power1.inOut" }, land);

      // El contenido real se enciende debajo del fantasma.
      if (i === 0) {
        tl.to(headRef.current, { autoAlpha: 1, duration: 0.15 }, land)
          .to(rulerRef.current, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, land)
          // Con la cabecera puesta, las escuadras traban el marco (lenguaje V1).
          .to(corners(), { autoAlpha: 1, duration: 0.12, stagger: 0.04 }, land + 0.05)
          .to(corners(), { x: 0, y: 0, duration: 0.32, ease: "back.out(2.6)", stagger: 0.04 }, land + 0.05);
      } else if (i === 1) {
        if (eyebrow) tl.set(eyebrow, { visibility: "visible" }, land);
        if (h1) tl.to(h1, { opacity: 1, duration: 0.14 }, land);
      } else {
        tl.to(groups[i], { opacity: 1, duration: 0.14, stagger: 0.03 }, land);
      }
      if (i === PIECES.length - 1) {
        tl.call(fireDrop, undefined, land)
          .to(bootLabelRef.current, { autoAlpha: 0, duration: 0.12 }, land)
          .to([liveLabelRef.current, liveDotRef.current], { autoAlpha: 1, duration: 0.2 }, land)
          .fromTo(liveLabelRef.current, { scale: 1.35 }, { scale: 1, duration: 0.25, ease: "power3.out", immediateRender: false }, land)
          .to(footRef.current, { autoAlpha: 1, duration: 0.3 }, land + 0.1);

        // Activado: el contorno se enciende de golpe, un destello lo recorre
        // en sentido horario y queda prendido latiendo.
        const [top, right, bottom, left] = sweepRefs.current;
        tl.fromTo(edgeRef.current, { autoAlpha: 0, scale: 1.015 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power3.out", immediateRender: false }, land)
          .fromTo(glowCorners(), { autoAlpha: 0, scale: 1.5 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2)", stagger: 0.05, immediateRender: false }, land)
          // Cada tramo arranca fuera de su borde (si no, esperaría visible a mitad de camino).
          .set([top, bottom], { autoAlpha: 1, xPercent: -100 }, land)
          .set(bottom, { xPercent: 200 }, land)
          .set([right, left], { autoAlpha: 1, yPercent: -100 }, land)
          .set(left, { yPercent: 200 }, land)
          .fromTo(top, { xPercent: -100 }, { xPercent: 200, duration: 0.32, ease: "none", immediateRender: false }, land)
          .fromTo(right, { yPercent: -100 }, { yPercent: 200, duration: 0.32, ease: "none", immediateRender: false }, land + 0.22)
          .fromTo(bottom, { xPercent: 200 }, { xPercent: -100, duration: 0.32, ease: "none", immediateRender: false }, land + 0.44)
          .fromTo(left, { yPercent: 200 }, { yPercent: -100, duration: 0.32, ease: "none", immediateRender: false }, land + 0.66)
          .set(sweepRefs.current, { autoAlpha: 0 }, land + 1)
          .call(startPulse, undefined, land + 1);
      }

      // Suelta: la garra abre, el brazo levanta y sale de cuadro; el fantasma se apaga.
      tl.to(p.arm.fl, { rotation: 24, duration: 0.12 }, land + 0.04)
        .to(p.arm.fr, { rotation: -24, duration: 0.12 }, land + 0.04)
        .to(p.arm.arm, { rotation: -10, y: -14, duration: 0.2, ease: "power2.out" }, land + 0.1)
        .to(p.arm.arm, { x: -(W + 120), duration: 0.45, ease: "power2.in" }, land + 0.22)
        .to([p.ghost, p.tab], { autoAlpha: 0, duration: 0.3 }, land + 0.1)
        .set(p.carrier, { autoAlpha: 0 }, land + 0.7);
    });

    tlRef.current = tl;
    // Solo en desarrollo: las pruebas headless (~1 fps) pausan y posicionan la animación.
    if (import.meta.env.DEV) (window as unknown as { __heroVBTl?: gsap.core.Timeline }).__heroVBTl = tl;
  };

  useLayoutEffect(() => {
    if (reduced) setFinal();
    else disassemble();
    return () => {
      runRef.current++;
      pulseRef.current?.kill();
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
    else assemble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  // Cambio de tema: el panel se desarma y los brazos lo vuelven a armar (onDrop de nuevo).
  useEffect(() => {
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    if (!play) return;
    droppedRef.current = false;
    if (reduced) {
      fireDrop();
      return;
    }
    setRecal(true);
    assemble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const mono = "font-mono text-[10px] uppercase tracking-[0.16em]";

  return (
    <div
      ref={frameRef}
      data-hero-mobile="vB"
      className={[
        "relative isolate w-full max-w-md px-4 py-4 min-[380px]:px-5 [@media(min-height:780px)]:py-7",
        // Mismo restyle que la pantalla de mando (V1): nombre grande sin
        // tarjeta, volanta en mono, esquinas rectas.
        "[&_h1>br:first-of-type]:hidden [&_h1]:text-[clamp(2rem,9.6vw,2.6rem)] [&_h1]:leading-[1.02] [&_h1]:tracking-[-0.02em]",
        "[&_.eyebrow]:mb-2 [&_.eyebrow]:font-mono [&_.eyebrow]:text-[11px] [&_.eyebrow]:tracking-[0.3em]",
        "[&_.eyebrow]:before:mr-2 [&_.eyebrow]:before:text-muted [&_.eyebrow]:before:content-['>']",
        "[&_a]:rounded-[3px] [&_.rounded-lg]:rounded-[3px]",
        className ?? "",
      ].join(" ")}
    >
      {/* Contorno de energía: línea fina + halo, apagado hasta el encastre final. */}
      <div
        ref={edgeRef}
        aria-hidden
        className="pointer-events-none invisible absolute inset-0 border border-brand-primary/40 shadow-[0_0_16px_rgb(var(--color-brand-primary)/0.35),inset_0_0_14px_rgb(var(--color-brand-primary)/0.10)]"
      />
      {/* Destello que recorre el contorno (cuatro tramos que se deslizan por transform). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          "left-0 top-0 h-[3px] w-1/2 bg-gradient-to-r",
          "right-0 top-0 h-1/2 w-[3px] bg-gradient-to-b",
          "bottom-0 left-0 h-[3px] w-1/2 bg-gradient-to-r",
          "bottom-0 left-0 h-1/2 w-[3px] bg-gradient-to-b",
        ].map((pos, i) => (
          <span
            key={i}
            ref={(el) => (sweepRefs.current[i] = el)}
            className={`invisible absolute from-transparent via-brand-primary to-transparent shadow-[0_0_12px_3px_rgb(var(--color-brand-primary)/0.7)] ${pos}`}
          />
        ))}
      </div>
      {/* Escuadras encendidas (copia con brillo encima de las escuadras base). */}
      {CORNERS.map((c, i) => (
        <span
          key={`g${i}`}
          ref={(el) => (glowCornerRefs.current[i] = el)}
          aria-hidden
          className={`pointer-events-none invisible absolute h-5 w-5 border-brand-primary [filter:drop-shadow(0_0_5px_rgb(var(--color-brand-primary)))_drop-shadow(0_0_10px_rgb(var(--color-brand-primary)/0.6))] ${c.pos}`}
        />
      ))}
      {CORNERS.map((c, i) => (
        <span
          key={i}
          ref={(el) => (cornerRefs.current[i] = el)}
          aria-hidden
          className={`pointer-events-none absolute h-5 w-5 border-brand-primary ${c.pos}`}
        />
      ))}

      {/* Cabecera de telemetría: operador + estado (crossfade dentro de la timeline). */}
      <div ref={headRef} className={`mb-2 flex items-center justify-between gap-3 ${mono} text-muted`}>
        <span className="truncate">
          OP/<span className="text-heading">CFC</span> · CELDA 01
        </span>
        {/* Dos estados apilados (se cruzan dentro de la timeline, así el seek es fiel). */}
        <span role="status" className="grid shrink-0 justify-items-end">
          <span ref={bootLabelRef} className="col-start-1 row-start-1 flex items-center gap-1.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-muted/60" />
            {recal ? "Recalibrando…" : "Ensamblando…"}
          </span>
          <span ref={liveLabelRef} className="col-start-1 row-start-1 flex origin-right items-center gap-1.5 font-semibold text-brand-primary">
            <span ref={liveDotRef} className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-primary/60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-primary" />
            </span>
            Disponible
          </span>
        </span>
      </div>

      <div
        ref={rulerRef}
        aria-hidden
        className="relative mb-3 h-2 origin-left border-t border-border/25 [@media(min-height:780px)]:mb-5"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgb(var(--color-border) / 0.35) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgb(var(--color-brand-primary) / 0.8) 0 1px, transparent 1px 40px)",
          backgroundSize: "100% 4px, 100% 8px",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* `contents`: no agrega caja (el layout queda idéntico a V1); sólo da un scope para medir. */}
      <div ref={contentRef} className="contents">
        {children}
      </div>

      <div
        ref={footRef}
        aria-hidden
        className={`mt-4 flex items-center justify-between border-t border-dashed border-border/20 pt-2 [@media(max-height:700px)]:hidden ${mono} text-muted/80`}
      >
        <span>ARG · UTC−3 · ENSAMBLE OK</span>
        <Clock />
      </div>

      {/* Taller: carros con la pieza fantasma + el brazo que la sostiene. Al
          terminar quedan todos ocultos (nunca tapan el panel armado). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
        {PIECES.map((piece, i) => (
          <div
            key={piece.label}
            ref={(el) => (pieceRefs.current[i].carrier = el)}
            data-hero-piece=""
            className="invisible absolute"
          >
            <div
              ref={(el) => (pieceRefs.current[i].ghost = el)}
              className="absolute inset-0 border border-dashed border-brand-primary/70"
              style={{
                backgroundColor: "rgb(var(--color-background) / 0.55)",
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgb(var(--color-brand-primary) / 0.10) 0 1px, transparent 1px 7px)",
              }}
            >
              {/* Encastre: el contorno pasa a sólido y destella. */}
              <div
                ref={(el) => (pieceRefs.current[i].solid = el)}
                className="absolute -inset-px border border-brand-primary shadow-[0_0_14px_rgb(var(--color-brand-primary)/0.45)]"
              />
              <span className="absolute bottom-1 left-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-brand-primary/80">
                {piece.label}
              </span>
              {i > 0 && (
                <span className="absolute right-1.5 top-1 font-mono text-[9px] tracking-[0.1em] text-muted">
                  {`${String(i + 1).padStart(2, "0")}/04`}
                </span>
              )}
            </div>
            {/* Punto de agarre: lengüeta de la pieza + brazo (espejado si entra por la derecha). */}
            <div
              ref={(el) => (pieceRefs.current[i].anchor = el)}
              className={`absolute top-0 h-0 w-0 ${piece.side === "right" ? "-scale-x-100" : ""}`}
            >
              <span
                ref={(el) => (pieceRefs.current[i].tab = el)}
                className="absolute -top-[7px] left-[-7px] h-[7px] w-[14px] border border-b-0 border-brand-primary bg-brand-primary/25" />
              <ArmSvg refs={pieceRefs.current[i].arm} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fondo: hoja de plano (V4) con la mira de la pantalla de mando (V1). */
export function HeroMobileBackdrop() {
  const mask = "radial-gradient(ellipse 90% 72% at 50% 42%, #000 25%, transparent 80%)";
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "linear-gradient(rgb(var(--color-brand-primary) / 0.06) 1px, transparent 1px)",
            "linear-gradient(90deg, rgb(var(--color-brand-primary) / 0.06) 1px, transparent 1px)",
            "linear-gradient(rgb(var(--color-muted) / 0.07) 1px, transparent 1px)",
            "linear-gradient(90deg, rgb(var(--color-muted) / 0.07) 1px, transparent 1px)",
          ].join(","),
          backgroundSize: "96px 96px, 96px 96px, 16px 16px, 16px 16px",
          backgroundPosition: "center",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      <div className="absolute left-1/2 top-[42%] h-[120vw] max-h-[560px] w-[120vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-brand-primary/10" />
        <div className="absolute inset-[12%] rounded-full border border-dashed border-brand-primary/15 motion-safe:animate-[spin_90s_linear_infinite]" />
      </div>
    </div>
  );
}
