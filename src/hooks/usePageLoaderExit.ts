import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

type UsePageLoaderExitArgs = {
  visible: boolean;
  rootRef: RefObject<HTMLDivElement>;
  gearsRef: RefObject<HTMLDivElement>;
  leftDoorRef: RefObject<HTMLDivElement>;
  rightDoorRef: RefObject<HTMLDivElement>;
  /** Se llama cuando las hojas terminaron de abrirse (o de inmediato con movimiento reducido). */
  onOpened?: () => void;
  /** Falta un instante para que terminen de abrirse: ahí arranca el Hero (video y texto). */
  onNearlyOpen?: () => void;
};

/**
 * Animación de salida del `PageLoader`: cuando `visible` pasa a `false`, en
 * vez de un fade simple, simula una puerta pesada (vault/refugio) que se
 * destraba y se abre en dos hojas. Los engranajes se apagan y recién ahí
 * las hojas se separan hacia los costados.
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
  leftDoorRef,
  rightDoorRef,
  onOpened,
  onNearlyOpen,
}: UsePageLoaderExitArgs) {
  const openedRef = useRef(false);

  useGSAP(() => {
    if (visible || openedRef.current) return;
    openedRef.current = true;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(rootRef.current, { autoAlpha: 0, display: "none" });
      onNearlyOpen?.();
      onOpened?.();
      return;
    }

    // Fluidez: las hojas se mueven solo con transform (capa propia, ver
    // PageLoader) y, apenas se apagan los engranajes, el bloque entero sale del
    // render (display:none) para que no corran spins/flotadores CSS mientras
    // las hojas se desplazan. El Hero espera a que falte poco para abrir.
    gsap.set([leftDoorRef.current, rightDoorRef.current], { force3D: true });
    gsap
      .timeline({
        defaults: { ease: "power1.inOut" },
        onComplete: () => {
          gsap.set(rootRef.current, { autoAlpha: 0, display: "none" });
          onOpened?.();
        },
      })
      .to(gearsRef.current, {
        opacity: 0,
        scale: 0.85,
        duration: 0.4,
        onComplete: () => {
          gsap.set(gearsRef.current, { display: "none" });
        },
      })
      .to(leftDoorRef.current, { xPercent: -100, duration: 1.4 }, "+=0.1")
      .to(rightDoorRef.current, { xPercent: 100, duration: 1.4 }, "<")
      .call(() => onNearlyOpen?.(), undefined, ">-0.6");
  }, [visible]);
}
