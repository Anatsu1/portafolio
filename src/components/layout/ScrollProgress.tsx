import { motion, useScroll } from "motion/react";

/**
 * Indicador de progreso de scroll: una línea fina fija al borde derecho
 * que se va "llenando" de arriba hacia abajo a medida que se recorre la
 * página, sobre un riel apenas visible. Usa el color de marca primario
 * (azul en claro, verde en oscuro — el token ya es theme-aware, no hace
 * falta lógica de tema acá).
 *
 * `useScroll` de Motion devuelve un MotionValue (0→1) que se aplica como
 * `scaleY` con origen arriba — se actualiza fuera del ciclo de render de
 * React, sin listeners manuales. No lleva spring: la barra espeja el
 * scroll del propio usuario 1:1 (con inercia se sentiría "flotando"), y
 * por lo mismo no necesita tratamiento de reduced-motion — solo se mueve
 * si el usuario scrollea.
 *
 * z-40: por debajo del Navbar (z-50) y del PageLoader (z-[100]) — la
 * línea se mete bajo el header en vez de cruzarlo.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <div aria-hidden className="fixed inset-y-0 right-0 z-40 w-[3px] bg-border/10">
      <motion.div
        className="h-full w-full origin-top bg-brand-primary"
        style={{ scaleY: scrollYProgress }}
      />
    </div>
  );
}
