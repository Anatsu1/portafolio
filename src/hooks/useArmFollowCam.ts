import { useCallback, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

// Posición aproximada de la pinza en el video (% del frame, ambas variantes
// son 16:9) + nivel de zoom deseado en cada momento, tomado a ojo de varios
// frames reales del clip — no es tracking pixel a pixel, pero alcanza para
// una "cámara" que hace foco y sigue el gesto. Zoom sutil a propósito (máx.
// ~1.2): con más zoom el pan se sentía brusco/inestable. Afinar si se
// regenera el video. Mismos instantes que `DROP_TIME` (Hero/useHeroReveal)
// para que el foco llegue a la celda justo cuando se activa el aura.
const KEYFRAMES: { t: number; x: number; y: number; scale: number }[] = [
  { t: 0, x: 57, y: 43, scale: 1.12 }, // reach inicial, garra vacía
  { t: 1, x: 56, y: 63, scale: 1.18 }, // agarra el círculo en la cinta
  { t: 2, x: 50, y: 43, scale: 1.18 }, // levanta, ya con el círculo
  { t: 3, x: 53, y: 32, scale: 1.15 }, // cruza hacia la celda
  { t: 4.4, x: 23, y: 30, scale: 1.2 }, // entrega (= DROP_TIME)
  { t: 5.5, x: 23, y: 30, scale: 1.2 }, // se queda un instante en la celda
  { t: 6, x: 60, y: 27, scale: 1.15 }, // vuelve, garra vacía
  { t: 7, x: 53, y: 47, scale: 1.08 }, // acercándose al reposo
  { t: 8, x: 57, y: 43, scale: 1 }, // reposo, zoom normal de nuevo (= pose inicial)
];

type UseArmFollowCamArgs = {
  videoRef: RefObject<HTMLVideoElement>;
  /** Solo tiene sentido en mobile — en desktop se ve toda la escena igual. */
  enabled: boolean;
  /**
   * Cualquier valor que cambie cada vez que el `<video>` se remonta (acá,
   * el tema — `HeroArmVideo` usa `key={theme}`). El timeline se reconstruye
   * contra el nodo de video nuevo y `start()` puede volver a dispararse;
   * sin esto, después de un toggle de tema el timeline viejo queda
   * apuntando a un `<video>` ya desmontado y no pasa nada.
   */
  resetKey: string;
};

/**
 * "Cámara" que hace foco en la pinza y la sigue mientras agarra, cruza y
 * entrega el círculo — pensada para mobile, donde `object-cover` estático
 * recorta tanto el video que no se entiende qué hace el brazo. En vez de un
 * punto/overlay inventado, esto anima el `object-position` (qué parte del
 * video queda centrada) + un `scale` (zoom sutil) del propio `<video>`, así
 * se ve directamente el contenido real del clip, un poco más cerca y
 * siguiendo la acción.
 *
 * `start()` lo llama `HeroArmVideo` en el mismo momento que arranca la
 * reproducción real (`handleCanPlayThrough`), para que quede sincronizado:
 * 1 segundo de timeline = 1 segundo de video. Al terminar, vuelve al
 * `scale: 1` / encuadre normal (mismo que desktop).
 *
 * `prefers-reduced-motion` o `enabled: false` (desktop): no arma la
 * timeline, el video queda con su `object-position`/`scale` normales.
 */
export function useArmFollowCam({ videoRef, enabled, resetKey }: UseArmFollowCamArgs) {
  const startedRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      startedRef.current = false;

      if (!enabled || !videoRef.current) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      gsap.set(videoRef.current, {
        objectPosition: `${KEYFRAMES[0].x}% ${KEYFRAMES[0].y}%`,
        scale: KEYFRAMES[0].scale,
      });

      const tl = gsap.timeline({ paused: true });
      for (let i = 1; i < KEYFRAMES.length; i++) {
        const prev = KEYFRAMES[i - 1];
        const curr = KEYFRAMES[i];
        tl.to(
          videoRef.current,
          {
            objectPosition: `${curr.x}% ${curr.y}%`,
            scale: curr.scale,
            duration: curr.t - prev.t,
            ease: "power1.inOut",
          },
          prev.t
        );
      }
      tlRef.current = tl;

      return () => {
        tl.kill();
        tlRef.current = null;
      };
    },
    { dependencies: [enabled, resetKey] }
  );

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    tlRef.current?.play();
  }, []);

  return { start };
}
