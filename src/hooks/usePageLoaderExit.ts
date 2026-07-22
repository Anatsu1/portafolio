import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

type UsePageLoaderExitArgs = {
  visible: boolean;
  rootRef: RefObject<HTMLDivElement>;
  gearsRef: RefObject<HTMLDivElement>;
  lockRef: RefObject<HTMLDivElement>;
  leftDoorRef: RefObject<HTMLDivElement>;
  rightDoorRef: RefObject<HTMLDivElement>;
};

/**
 * Animación de salida del `PageLoader`: cuando `visible` pasa a `false`, en
 * vez de un fade simple, simula una puerta pesada (vault/refugio) que se
 * destraba y se abre en dos hojas. Los engranajes se apagan, el cerrojo
 * central pulsa como si se destrabara, y recién ahí las hojas se separan
 * hacia los costados.
 *
 * `prefers-reduced-motion`: salta directo al estado final (oculto), sin
 * animación — a diferencia del fade CSS anterior, esto es un tween de GSAP
 * (JS), así que la regla global de `index.css` no alcanza a neutralizarlo
 * solo; hay que chequearlo acá.
 */
export function usePageLoaderExit({
  visible,
  rootRef,
  gearsRef,
  lockRef,
  leftDoorRef,
  rightDoorRef,
}: UsePageLoaderExitArgs) {
  const openedRef = useRef(false);

  useGSAP(() => {
    if (visible || openedRef.current) return;
    openedRef.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(rootRef.current, { autoAlpha: 0 });
      return;
    }

    gsap
      .timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => gsap.set(rootRef.current, { autoAlpha: 0 }),
      })
      .to(gearsRef.current, { opacity: 0, scale: 0.85, duration: 0.3 })
      .to(lockRef.current, { scale: 1.35, opacity: 0, duration: 0.25 }, "<")
      .to(leftDoorRef.current, { xPercent: -100, duration: 0.9 }, "+=0.1")
      .to(rightDoorRef.current, { xPercent: 100, duration: 0.9 }, "<");
  }, [visible]);
}
