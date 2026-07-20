import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

// Curva de salida suave, compartida por todas las animaciones de sección.
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Aparición de un bloque al entrar en viewport (fade + slide up), una sola vez.
 * Con `prefers-reduced-motion` sólo hace fade (sin desplazamiento).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Variants para grillas con efecto cascada. Aplicá `containerVariants` al
 * contenedor (`initial="hidden" whileInView="show" viewport={{ once: true }}`)
 * e `itemVariants` a cada hijo `motion`. El movimiento se neutraliza solo con
 * `prefers-reduced-motion` gracias a `<MotionConfig reducedMotion="user">`.
 */
export const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
