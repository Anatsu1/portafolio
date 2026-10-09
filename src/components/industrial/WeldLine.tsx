import { motion } from "motion/react";

type WeldLineProps = {
  className?: string;
  /** Segundos de espera antes de arrancar (para escalonar con otras animaciones). */
  delay?: number;
  /** Segundos que tarda el cordón en recorrer la línea. */
  duration?: number;
};

/**
 * Cordón de soldadura: el firma visual del sitio. Al entrar en pantalla un
 * punto incandescente recorre la línea dejando metal al rojo vivo que se va
 * enfriando hasta quedar como acero con un leve rastro de brasa. Se anima una
 * sola vez. Con movimiento reducido salta al estado final (acero frío).
 *
 * El ancho lo da el padre (`className="w-16"`, `w-full`, …).
 */
export default function WeldLine({ className = "w-full", delay = 0, duration = 1.1 }: WeldLineProps) {
  const draw = { duration, delay, ease: "easeInOut" as const };
  return (
    <div aria-hidden className={`relative h-[3px] ${className}`}>
      {/* Acero ya frío (lo que queda al final) */}
      <motion.span
        className="absolute inset-0 origin-left rounded-full bg-border/35"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 1 }}
        transition={draw}
      />
      {/* Metal al rojo que se enfría: avanza con el punto y después se apaga */}
      <motion.span
        className="absolute inset-0 origin-left rounded-full"
        style={{ background: "linear-gradient(90deg, #7a1d0a 0%, #e8350f 55%, #ffb347 100%)" }}
        initial={{ scaleX: 0, opacity: 1 }}
        whileInView={{ scaleX: 1, opacity: [1, 1, 0.16] }}
        viewport={{ once: true, amount: 1 }}
        transition={{
          scaleX: draw,
          opacity: { duration: 3.4, delay, times: [0, 0.3, 1], ease: "easeOut" },
        }}
      />
      {/* Punto de soldadura */}
      <motion.span
        className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff1c2] shadow-[0_0_10px_3px_rgba(255,122,26,0.9)]"
        initial={{ left: "0%", opacity: 0 }}
        whileInView={{ left: "100%", opacity: [1, 1, 0] }}
        viewport={{ once: true, amount: 1 }}
        transition={{
          left: draw,
          opacity: { duration: duration + 0.2, delay, times: [0, 0.9, 1] },
        }}
      />
    </div>
  );
}
