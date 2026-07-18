import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { RefObject } from "react";

const GLOW_IN = "0 0 20px rgb(var(--color-brand-primary) / 1)";
const GLOW_OUT = "0 0 0px rgb(var(--color-brand-primary) / 0)";

const REST = { upper: -5, fore: 25, clawOpen: 38 };
const REACH = { upper: 70, fore: 30 };
const CLAW_CLOSED = 6;
const RETRACT = { upper: 20, fore: 25 };

type UseHeroAssemblyArgs = {
  sectionRef: RefObject<HTMLElement>;
  overlayRef: RefObject<HTMLDivElement>;
  travelingCircleRef: RefObject<HTMLDivElement>;
  middleNameLetterRefs: RefObject<(HTMLSpanElement | null)[]>;
  lastLetterIndex: number;
  eyebrowRef: RefObject<HTMLParagraphElement>;
  firstNameRef: RefObject<HTMLSpanElement>;
  lastNamesRef: RefObject<HTMLSpanElement>;
  restGroupRef: RefObject<HTMLDivElement>;
  rigWrapperRef: RefObject<HTMLDivElement>;
  upperArmRef: RefObject<SVGGElement>;
  forearmRef: RefObject<SVGGElement>;
  clawLeftRef: RefObject<SVGGElement>;
  clawRightRef: RefObject<SVGGElement>;
  beltCircleRef: RefObject<SVGCircleElement>;
  isMobile: boolean;
  onMobileArmHidden?: () => void;
};

function toLocalCenter(rect: DOMRect, overlayRect: DOMRect) {
  return {
    x: rect.left + rect.width / 2 - overlayRect.left,
    y: rect.top + rect.height / 2 - overlayRect.top,
  };
}

export function useHeroAssembly(refs: UseHeroAssemblyArgs) {
  const {
    sectionRef,
    overlayRef,
    travelingCircleRef,
    middleNameLetterRefs,
    lastLetterIndex,
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
    onMobileArmHidden,
  } = refs;

  useGSAP(
    () => {
      const letters = middleNameLetterRefs.current ?? [];
      const otherLetters = letters.filter((_, i) => i !== lastLetterIndex);
      const lastLetter = letters[lastLetterIndex];

      const revealTargets = [
        firstNameRef.current,
        lastNamesRef.current,
        restGroupRef.current,
        eyebrowRef.current,
      ];

      // svgOrigin (a diferencia de transformOrigin) toma coordenadas en el
      // espacio local del propio SVG, sin la ambigüedad de "px del bbox" ni
      // el escalado del viewBox — "0 0" es exactamente la articulación.
      gsap.set(upperArmRef.current, { svgOrigin: "0 0", rotation: REST.upper });
      gsap.set(forearmRef.current, { svgOrigin: "0 0", rotation: REST.fore });
      gsap.set(clawLeftRef.current, { svgOrigin: "0 0", rotation: -REST.clawOpen });
      gsap.set(clawRightRef.current, { svgOrigin: "0 0", rotation: REST.clawOpen });

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduceMotion) {
        gsap.set(letters, { opacity: 1, y: 0, textShadow: GLOW_OUT });
        gsap.set(revealTargets, { opacity: 1, y: 0 });
        gsap.set(travelingCircleRef.current, { opacity: 0 });
        gsap.set(beltCircleRef.current, { opacity: 0 });
        rigWrapperRef.current?.classList.add("animate-float");
        return;
      }

      let cancelled = false;
      let tl: gsap.core.Timeline | null = null;

      document.fonts.ready.then(() => {
        if (cancelled) return;

        const overlay = overlayRef.current;
        const circle = travelingCircleRef.current;
        const beltCircle = beltCircleRef.current;
        if (!overlay || !circle || !beltCircle || !lastLetter) return;

        const overlayRect = overlay.getBoundingClientRect();
        const start = toLocalCenter(beltCircle.getBoundingClientRect(), overlayRect);
        const end = toLocalCenter(lastLetter.getBoundingClientRect(), overlayRect);

        gsap.set(circle, {
          x: start.x,
          y: start.y,
          xPercent: -50,
          yPercent: -50,
          opacity: 0,
          scale: 0.6,
        });

        const timeScale = isMobile ? 1.15 : 1;

        tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        tl.from(rigWrapperRef.current, { opacity: 0, y: 12, duration: 0.4 }, "sceneIn")
          // el brazo se estira hacia la cinta
          .to(upperArmRef.current, { rotation: REACH.upper, duration: 0.6, ease: "power2.inOut" }, "reach")
          .to(forearmRef.current, { rotation: REACH.fore, duration: 0.6, ease: "power2.inOut" }, "reach")
          // la garra cierra sobre el círculo
          .to(clawLeftRef.current, { rotation: -CLAW_CLOSED, duration: 0.25 }, "grab")
          .to(clawRightRef.current, { rotation: CLAW_CLOSED, duration: 0.25 }, "grab")
          .set(beltCircle, { opacity: 0 }, "grab")
          .to(circle, { opacity: 1, scale: 1, duration: 0.15 }, "grab")
          // levanta y retrae mientras viaja hacia la posición de la "o"
          .to(circle, { y: "-=60", duration: 0.3 }, "lift")
          .to(upperArmRef.current, { rotation: RETRACT.upper, duration: 0.5, ease: "power2.inOut" }, "lift")
          .to(forearmRef.current, { rotation: RETRACT.fore, duration: 0.5, ease: "power2.inOut" }, "lift")
          .to(circle, { x: end.x, y: end.y - 20, duration: 0.7, ease: "power2.inOut" }, "lift+=0.25")
          .to(circle, { y: end.y, duration: 0.15 }, "lift+=0.95")
          // brillo + morph: el círculo se convierte en la "o"
          .to(circle, {
            scale: 1.4,
            filter: "drop-shadow(0 0 18px rgb(var(--color-brand-primary) / 0.9))",
            duration: 0.25,
          }, "morph")
          .to(circle, { opacity: 0, scale: 0.5, duration: 0.3 }, "morph+=0.1")
          .to(lastLetter, {
            opacity: 1,
            y: 0,
            scale: 1,
            textShadow: GLOW_OUT,
            duration: 0.35,
            ease: "back.out(2)",
          }, "morph+=0.05")
          .fromTo(
            lastLetter,
            { textShadow: GLOW_IN },
            { textShadow: GLOW_OUT, duration: 0.4 },
            "morph+=0.05"
          )
          // el brazo suelta y se asienta en reposo
          .to(upperArmRef.current, { rotation: REST.upper, duration: 0.6, ease: "power2.inOut" }, "morph")
          .to(forearmRef.current, { rotation: REST.fore, duration: 0.6, ease: "power2.inOut" }, "morph")
          .to(clawLeftRef.current, { rotation: -REST.clawOpen, duration: 0.35 }, "morph")
          .to(clawRightRef.current, { rotation: REST.clawOpen, duration: 0.35 }, "morph")
          // resto de las letras de "Augusto" completan con incandescencia
          .to(otherLetters, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 }, "morph+=0.35")
          .fromTo(
            otherLetters,
            { textShadow: GLOW_IN },
            { textShadow: GLOW_OUT, duration: 0.5, stagger: 0.05 },
            "morph+=0.35"
          );

        if (isMobile) {
          // en mobile el brazo es protagonista solo al principio: termina
          // su actuación (arma la "o") y se desvanece/colapsa antes de que
          // aparezca el resto del nombre, para no ocupar pantalla de más.
          tl.to(rigWrapperRef.current, { opacity: 0, duration: 0.3 }, "morph+=0.5").call(
            () => onMobileArmHidden?.(),
            undefined,
            "morph+=0.8"
          );
        } else {
          tl.call(
            () => rigWrapperRef.current?.classList.add("animate-float"),
            undefined,
            "morph+=0.35"
          );
        }

        // luego, en orden: nombre, apellidos, y el resto junto
        tl.to(firstNameRef.current, { opacity: 1, y: 0, duration: 0.4 }, "morph+=0.85")
          .to(lastNamesRef.current, { opacity: 1, y: 0, duration: 0.4 }, "morph+=1.15")
          .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.4 }, "morph+=1.5")
          .to(restGroupRef.current, { opacity: 1, y: 0, duration: 0.4 }, "morph+=1.5");

        tl.timeScale(timeScale);
      });

      return () => {
        cancelled = true;
        tl?.kill();
      };
    },
    { scope: sectionRef, dependencies: [isMobile] }
  );
}
