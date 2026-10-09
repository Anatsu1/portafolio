import type { ReactNode } from "react";
import { motion } from "motion/react";
import WeldLine from "./industrial/WeldLine";

// Misma curva de salida que el resto de las animaciones de sección (ver Reveal).
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type SectionHeadingProps = {
  /** Número de sección ("01"): ordena la lectura y da ritmo, como un plano técnico. */
  index: string;
  eyebrow: string;
  title: string;
  /** Clase de color del número y el cursor. Por defecto el de marca. */
  accent?: string;
  subtitle?: ReactNode;
};

/**
 * Encabezado de sección: número + línea que se dibuja + volanta, y un título
 * que sube palabra por palabra desde una máscara al entrar en pantalla, con un
 * guion bajo parpadeante al final (como un cursor de terminal). Se anima una
 * sola vez. El `aria-label` lleva el título completo y las palabras partidas
 * van `aria-hidden`, así el lector de pantalla no las lee dos veces.
 */
export default function SectionHeading({
  index,
  eyebrow,
  title,
  accent = "text-brand-primary",
  subtitle,
}: SectionHeadingProps) {
  const words = title.split(" ");
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className={`font-display text-sm font-bold tabular-nums ${accent}`}>{index}</span>
        <WeldLine className="w-16 shrink-0" />
        <span className="eyebrow !mb-0">{eyebrow}</span>
      </div>

      {/* El disparo lo da el h2 (visible), no cada palabra: las palabras arrancan
          recortadas por su máscara y el observador de visibilidad las ve ocultas. */}
      <motion.h2
        aria-label={title}
        className="section-title"
        initial="oculto"
        whileInView="visible"
        viewport={{ once: true, amount: 0.6 }}
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        {words.map((word, i) => (
          <span key={i} aria-hidden className="mr-[0.26em] inline-block overflow-hidden pb-[0.14em] align-bottom">
            <motion.span
              className="inline-block"
              variants={{
                oculto: { y: "115%" },
                visible: { y: 0, transition: { duration: 0.75, ease: EASE } },
              }}
            >
              {word}
            </motion.span>
          </span>
        ))}
        <span aria-hidden className={`${accent} animate-pulse`}>
          _
        </span>
      </motion.h2>

      {subtitle && <div className="mt-3 max-w-2xl text-body">{subtitle}</div>}
    </div>
  );
}
