import { useCallback, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

// Las cuatro strings tienen la MISMA forma (0 0 Npx rgb(...) / A) a
// propósito: GSAP interpola string complejas número a número, así que
// cambiar la estructura rompería la transición.
/** Chispazo del momento del impacto. */
const GLOW_FLASH = "0 0 24px rgb(var(--color-brand-primary) / 1)";
/** Incandescencia sostenida: el nombre queda prendido con esto. */
const GLOW_ON = "0 0 16px rgb(var(--color-brand-primary) / 0.7)";
/** Extremo alto del latido del nombre (respira entre GLOW_ON y esto). */
const GLOW_PULSE = "0 0 22px rgb(var(--color-brand-primary) / 0.9)";
const GLOW_OUT = "0 0 0px rgb(var(--color-brand-primary) / 0)";

/** Clase que enciende los botones sociales (keyframes en index.css). */
const SOCKET_ON_CLASS = "hero-socket-on";

// Red de seguridad: si el video no dispara el "drop" (autoplay bloqueado,
// error, etc.), el aura se activa igual pasado este tiempo.
const SAFETY_MS = 7000;

type Theme = "light" | "dark";

type UseHeroRevealArgs = {
  sectionRef: RefObject<HTMLElement>;
  eyebrowRef: RefObject<HTMLParagraphElement>;
  firstNameRef: RefObject<HTMLSpanElement>;
  middleNameRef: RefObject<HTMLSpanElement>;
  lastNamesRef: RefObject<HTMLSpanElement>;
  restGroupRef: RefObject<HTMLDivElement>;
  lightRef: RefObject<HTMLDivElement>;
  /** Contenedor de los links de GitHub/LinkedIn (se energizan sus `<a>`). */
  socialsRef: RefObject<HTMLDivElement>;
  theme: Theme;
};

/**
 * Reveal del texto del Hero con incandescencia (glow): la timeline arranca
 * pausada y se dispara con `startReveal()` — `Hero.tsx` la llama apenas el
 * video avisa que tiene buffer suficiente (`onReady`), en paralelo con el
 * propio arranque del video. Ya no depende de que el brazo termine su gesto,
 * solo de que la escena esté lista para arrancar sin trabarse. Antes de
 * reproducir espera además `document.fonts.ready`, para que Sora ya esté
 * aplicada y no shiftee el layout.
 *
 * Además arma una segunda timeline, de "aura", disparada por
 * `triggerOverload()` — que `Hero.tsx` conecta al `onDrop` de `HeroArmVideo`,
 * o sea el instante en que el brazo suelta el círculo. Ese impacto reparte
 * energía por todo el bloque, y cada pieza la recibe distinto:
 *
 *   - Halo detrás del texto: aparece y QUEDA, con un pulso suave.
 *   - Nombre (las 3 líneas del h1): chispazo y después QUEDA prendido, con
 *     un latido en fase con el halo. Antes se apagaba a los ~0.7s y quedaba
 *     solo el halo, que se leía como que el efecto se cortaba.
 *   - Volanta y bloque de texto secundario: chispazo y se apagan — que todo
 *     el párrafo quedara brillando sería ilegible.
 *   - Botones de GitHub/LinkedIn: parpadean como un tubo arrancando y quedan
 *     encendidos (clase `hero-socket-on`, keyframes en index.css).
 *
 * Todo eso se rearma en cada cambio de tema: vuelve al estado apagado y se
 * reactiva cuando el video (que se remonta y repite) suelta el círculo otra
 * vez.
 *
 * Respeta `prefers-reduced-motion`: aplica el estado final del texto de una
 * sola vez, el halo nunca se anima (queda invisible) y los botones se quedan
 * en su estado normal — sin video no hay historia de energía que contar.
 */
export function useHeroReveal(refs: UseHeroRevealArgs) {
  const {
    sectionRef,
    eyebrowRef,
    firstNameRef,
    middleNameRef,
    lastNamesRef,
    restGroupRef,
    lightRef,
    socialsRef,
    theme,
  } = refs;

  const overloadTlRef = useRef<gsap.core.Timeline | null>(null);
  const pulseTweenRef = useRef<gsap.core.Tween | null>(null);
  const namePulseTweenRef = useRef<gsap.core.Tween | null>(null);
  const overloadFiredRef = useRef(false);
  const prevThemeRef = useRef<Theme | null>(null);
  const revealTlRef = useRef<gsap.core.Timeline | null>(null);
  const startedRef = useRef(false);

  // Los botones se encienden por clase, no por estilos inline de GSAP: así
  // los `hover:` de Tailwind le siguen ganando por especificidad una vez
  // prendidos (un estilo inline los bloquearía).
  const setSocketsOn = useCallback(
    (on: boolean) => {
      const links = socialsRef.current?.querySelectorAll("a");
      links?.forEach((link) => link.classList.toggle(SOCKET_ON_CLASS, on));
    },
    [socialsRef]
  );

  const triggerOverload = useCallback(() => {
    if (overloadFiredRef.current) return;
    overloadFiredRef.current = true;
    overloadTlRef.current?.restart();
  }, []);

  const startReveal = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      await document.fonts.ready;
      revealTlRef.current?.play();
    })();
  }, []);

  useGSAP(
    () => {
      // El nombre queda prendido; el resto sólo recibe el chispazo.
      const nameTargets = [
        firstNameRef.current,
        middleNameRef.current,
        lastNamesRef.current,
      ];
      const secondaryTargets = [eyebrowRef.current, restGroupRef.current];

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        gsap.set([...nameTargets, ...secondaryTargets], {
          opacity: 1,
          y: 0,
          textShadow: GLOW_OUT,
        });
        gsap.set(lightRef.current, { opacity: 0 });
        overloadFiredRef.current = true;
        startedRef.current = true;
        return;
      }

      // Timeline del aura, disparada por `triggerOverload()`.
      const overloadTl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      overloadTl
        .to(lightRef.current, { opacity: 1, scale: 1.05, duration: 0.4 })
        .fromTo(nameTargets, { textShadow: GLOW_FLASH }, { textShadow: GLOW_ON, duration: 0.7 }, "<")
        .fromTo(
          secondaryTargets,
          { textShadow: GLOW_FLASH },
          { textShadow: GLOW_OUT, duration: 0.7 },
          "<"
        )
        .call(() => setSocketsOn(true), undefined, "<+=0.15")
        .call(() => {
          pulseTweenRef.current?.kill();
          namePulseTweenRef.current?.kill();
          // Pulso sutil: el núcleo (color de fondo) nunca baja de una
          // opacidad casi total, para que el cuadrado/círculo del video
          // quede tapado siempre — la "energía" se siente en el scale/brillo,
          // no en dejar ver el fondo del video de nuevo.
          pulseTweenRef.current = gsap.to(lightRef.current, {
            opacity: 0.92,
            scale: 1,
            duration: 2.2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          // Mismo ritmo que el halo: el nombre respira con él, no aparte.
          namePulseTweenRef.current = gsap.to(nameTargets, {
            textShadow: GLOW_PULSE,
            duration: 2.2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        });
      overloadTlRef.current = overloadTl;

      const safety = window.setTimeout(triggerOverload, SAFETY_MS);

      // Timeline del reveal del texto: pausada hasta `startReveal()`. Acá el
      // glow sí es un destello por pieza (van apareciendo de a una); la
      // incandescencia que queda es la del impacto, más abajo.
      const revealTl = gsap
        .timeline({ paused: true, defaults: { ease: "power2.out" } })
        .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.4 })
        .to(firstNameRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.15")
        .fromTo(firstNameRef.current, { textShadow: GLOW_FLASH }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(middleNameRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .fromTo(middleNameRef.current, { textShadow: GLOW_FLASH }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(lastNamesRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .fromTo(lastNamesRef.current, { textShadow: GLOW_FLASH }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(restGroupRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.1");
      revealTlRef.current = revealTl;

      return () => {
        window.clearTimeout(safety);
        pulseTweenRef.current?.kill();
        pulseTweenRef.current = null;
        namePulseTweenRef.current?.kill();
        namePulseTweenRef.current = null;
        overloadTl.kill();
        overloadTlRef.current = null;
        revealTl.kill();
        revealTlRef.current = null;
      };
    },
    { scope: sectionRef }
  );

  // El video se remonta y repite la animación en cada cambio de tema
  // (`key={theme}` en HeroArmVideo). Todo lo que quedó "encendido" acompaña
  // ese ciclo: se apaga apenas cambia el tema y se reactiva cuando el video
  // repetido vuelve a soltar el círculo (si no, el parpadeo de los botones
  // no volvería a verse nunca y el nombre quedaría con el glow del tema
  // anterior).
  useEffect(() => {
    // Compara contra el tema ANTERIOR en vez de usar un flag de "primera
    // corrida". No es un detalle: StrictMode (dev) monta, desmonta y vuelve
    // a montar, así que los efectos corren dos veces mientras los refs
    // sobreviven — un flag se consumía en la primera invocación y la segunda
    // ejecutaba este reset sobre el reveal recién arrancado. Con esto, sólo
    // corre si el tema cambió de verdad, invocado las veces que sea.
    if (prevThemeRef.current === theme) return;
    const isFirstRun = prevThemeRef.current === null;
    prevThemeRef.current = theme;
    if (isFirstRun) return;

    pulseTweenRef.current?.kill();
    pulseTweenRef.current = null;
    namePulseTweenRef.current?.kill();
    namePulseTweenRef.current = null;
    overloadTlRef.current?.pause(0);
    gsap.to(lightRef.current, { opacity: 0, scale: 1, duration: 0.25, overwrite: true });
    // Sin `overwrite` a propósito: los pulsos ya se mataron por ref arriba, y
    // un overwrite acá barre TODOS los tweens de estas tres piezas — incluido
    // el del `opacity` del reveal, que las dejaba invisibles para siempre.
    gsap.to([firstNameRef.current, middleNameRef.current, lastNamesRef.current], {
      textShadow: GLOW_OUT,
      duration: 0.25,
    });
    setSocketsOn(false);
    overloadFiredRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return { startReveal, triggerOverload };
}
