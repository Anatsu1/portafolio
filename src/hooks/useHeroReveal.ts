import { useCallback, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

const GLOW_IN = "0 0 24px rgb(var(--color-brand-primary) / 1)";
const GLOW_OUT = "0 0 0px rgb(var(--color-brand-primary) / 0)";

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
  theme: Theme;
};

/**
 * Reveal del texto del Hero con incandescencia (glow): la timeline arranca
 * pausada y se dispara con `startReveal()` — `Hero.tsx` la llama apenas el
 * video avisa que tiene buffer suficiente (`onReady`), en paralelo con el
 * propio arranque del video (ver `HeroLoader`). Ya no depende de que el
 * brazo termine su gesto, solo de que la escena esté lista para arrancar sin
 * trabarse. Antes de reproducir espera además `document.fonts.ready`, para
 * que Sora ya esté aplicada y no shiftee el layout.
 *
 * Además arma una segunda timeline, de "aura": un halo detrás de todo el
 * bloque de texto (lo bastante fuerte como para tapar el cuadrado+círculo
 * que el video muestra ahí) + un brillo simultáneo sobre las 5 piezas de
 * texto, ya visibles. Se dispara con `triggerOverload()`, que `Hero.tsx`
 * conecta al `onDrop` de `HeroArmVideo` — el momento en que el brazo suelta
 * el círculo "activa" el aura. A diferencia de un destello, el aura queda
 * (con un pulso sutil, como si emanara energía) hasta que cambia el tema:
 * ahí vuelve al estado inicial (invisible) y se reactiva recién cuando el
 * video (que se remonta y repite con el nuevo tema) vuelve a soltar el
 * círculo.
 *
 * Respeta `prefers-reduced-motion`: aplica el estado final del texto de una
 * sola vez y el halo nunca se anima (queda invisible).
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
    theme,
  } = refs;

  const overloadTlRef = useRef<gsap.core.Timeline | null>(null);
  const pulseTweenRef = useRef<gsap.core.Tween | null>(null);
  const overloadFiredRef = useRef(false);
  const isFirstThemeRunRef = useRef(true);
  const revealTlRef = useRef<gsap.core.Timeline | null>(null);
  const startedRef = useRef(false);

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
      const textTargets = [
        eyebrowRef.current,
        firstNameRef.current,
        middleNameRef.current,
        lastNamesRef.current,
        restGroupRef.current,
      ];

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        gsap.set(textTargets, { opacity: 1, y: 0, textShadow: GLOW_OUT });
        gsap.set(lightRef.current, { opacity: 0 });
        overloadFiredRef.current = true;
        startedRef.current = true;
        return;
      }

      // Timeline del aura: halo + glow simultáneo sobre el texto, disparada
      // por `triggerOverload()`. El halo no vuelve a apagarse solo — queda
      // encendido, con un pulso suave, hasta el próximo cambio de tema.
      const overloadTl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      overloadTl
        .to(lightRef.current, { opacity: 1, scale: 1.05, duration: 0.4 })
        .fromTo(textTargets, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.7 }, "<")
        .call(() => {
          pulseTweenRef.current?.kill();
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
        });
      overloadTlRef.current = overloadTl;

      const safety = window.setTimeout(triggerOverload, SAFETY_MS);

      // Timeline del reveal del texto: pausada hasta `startReveal()`.
      const revealTl = gsap
        .timeline({ paused: true, defaults: { ease: "power2.out" } })
        .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.4 })
        .to(firstNameRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.15")
        .fromTo(firstNameRef.current, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(middleNameRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .fromTo(middleNameRef.current, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(lastNamesRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .fromTo(lastNamesRef.current, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(restGroupRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.1");
      revealTlRef.current = revealTl;

      return () => {
        window.clearTimeout(safety);
        pulseTweenRef.current?.kill();
        pulseTweenRef.current = null;
        overloadTl.kill();
        overloadTlRef.current = null;
        revealTl.kill();
        revealTlRef.current = null;
      };
    },
    { scope: sectionRef }
  );

  // El video se remonta y repite la animación en cada cambio de tema
  // (`key={theme}` en HeroArmVideo). El aura acompaña ese ciclo: vuelve a
  // invisible apenas cambia el tema, y se reactiva cuando el video repetido
  // vuelve a soltar el círculo.
  useEffect(() => {
    if (isFirstThemeRunRef.current) {
      isFirstThemeRunRef.current = false;
      return;
    }
    pulseTweenRef.current?.kill();
    pulseTweenRef.current = null;
    overloadTlRef.current?.pause(0);
    gsap.to(lightRef.current, { opacity: 0, scale: 1, duration: 0.25, overwrite: true });
    overloadFiredRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return { startReveal, triggerOverload };
}
