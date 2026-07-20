import { useCallback, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

const GLOW_IN = "0 0 24px rgb(var(--color-brand-primary) / 1)";
const GLOW_OUT = "0 0 0px rgb(var(--color-brand-primary) / 0)";

// Red de seguridad: si el video no dispara el "drop" (autoplay bloqueado,
// error, etc.), revelamos el texto igual pasado este tiempo.
const SAFETY_MS = 7000;

type UseHeroRevealArgs = {
  sectionRef: RefObject<HTMLElement>;
  eyebrowRef: RefObject<HTMLParagraphElement>;
  firstNameRef: RefObject<HTMLSpanElement>;
  middleNameRef: RefObject<HTMLSpanElement>;
  lastNamesRef: RefObject<HTMLSpanElement>;
  restGroupRef: RefObject<HTMLDivElement>;
};

/**
 * Reveal del texto del Hero con incandescencia (glow), sincronizado con el
 * video: la timeline arranca *pausada* y se dispara vía `startReveal()` cuando
 * el brazo suelta el círculo (lo llama `HeroArmVideo` en el momento del drop).
 * Cada línea del nombre aparece con un halo `textShadow` que se apaga, imitando
 * el efecto que antes armaba el brazo SVG.
 *
 * Respeta `prefers-reduced-motion` aplicando el estado final de una sola vez.
 * Devuelve `startReveal`, idempotente (una sola ejecución).
 */
export function useHeroReveal(refs: UseHeroRevealArgs) {
  const { sectionRef, eyebrowRef, firstNameRef, middleNameRef, lastNamesRef, restGroupRef } =
    refs;

  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const startedRef = useRef(false);

  const startReveal = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    tlRef.current?.play();
  }, []);

  useGSAP(
    () => {
      const targets = [
        eyebrowRef.current,
        firstNameRef.current,
        middleNameRef.current,
        lastNamesRef.current,
        restGroupRef.current,
      ];

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        gsap.set(targets, { opacity: 1, y: 0, textShadow: GLOW_OUT });
        startedRef.current = true;
        return;
      }

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      tl.to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.4 })
        .to(firstNameRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.15")
        .fromTo(firstNameRef.current, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(middleNameRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .fromTo(middleNameRef.current, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(lastNamesRef.current, { opacity: 1, y: 0, duration: 0.45 }, "-=0.25")
        .fromTo(lastNamesRef.current, { textShadow: GLOW_IN }, { textShadow: GLOW_OUT, duration: 0.6 }, "<")
        .to(restGroupRef.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.1");

      tlRef.current = tl;

      const safety = window.setTimeout(startReveal, SAFETY_MS);

      return () => {
        window.clearTimeout(safety);
        tl.kill();
        tlRef.current = null;
      };
    },
    { scope: sectionRef }
  );

  return { startReveal };
}
