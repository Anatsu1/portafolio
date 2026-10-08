import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { TIMELINE } from "../../data/timeline";
import SectionHeading from "../SectionHeading";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const KIND_LABEL = { educacion: "Educación", experiencia: "Experiencia" } as const;

/**
 * Trayectoria: educación y experiencia en una línea de tiempo vertical cuya
 * columna se "dibuja" a medida que se hace scroll (el progreso del scroll de
 * la sección mueve el escalado de la línea). Cada hito entra desde su lado.
 * En pantallas angostas la columna va a la izquierda y todo se apila.
 */
export default function Trayectoria() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 70%", "end 60%"] });
  const spine = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 });

  return (
    <section id="trayectoria" className="section-shell">
      <SectionHeading
        index="03"
        eyebrow="Trayectoria"
        title="Dónde estudié y en qué trabajé"
        subtitle="Siete años entre el aula, el freelance y la docencia: lo estudiado se declara en curso, lo construido se muestra en Proyectos."
      />

      <ol ref={listRef} className="relative mt-14 space-y-10 md:space-y-14">
        {/* Columna: fondo tenue + trazo que avanza con el scroll */}
        <div aria-hidden className="absolute bottom-0 left-3 top-0 w-px -translate-x-1/2 bg-border/15 md:left-1/2">
          <motion.div style={{ scaleY: spine }} className="h-full w-full origin-top bg-brand-primary" />
        </div>

        {TIMELINE.map((entry, i) => {
          const right = i % 2 === 1;
          return (
            <motion.li
              key={entry.item.title}
              className="relative pl-10 md:grid md:grid-cols-2 md:pl-0"
              initial={{ opacity: 0, x: right ? 36 : -36 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <span
                aria-hidden
                className="absolute left-3 top-1.5 h-3 w-3 -translate-x-1/2 rounded-sm rotate-45 border-2 border-brand-primary bg-background md:left-1/2"
              />
              <div className={right ? "md:col-start-2 md:pl-12" : "md:col-start-1 md:pr-12 md:text-right"}>
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary md:[&]:justify-start">
                  <span className={right ? "" : "md:ml-auto"}>{entry.when}</span>
                  <span className="rounded bg-heading/10 px-1.5 py-0.5 text-[10px] tracking-wider text-muted">
                    {KIND_LABEL[entry.kind]}
                  </span>
                  {entry.item.badge && (
                    <span className="rounded bg-brand-primary/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-brand-primary">
                      {entry.item.badge}
                    </span>
                  )}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-bold text-heading md:text-xl">{entry.item.title}</h3>
                {entry.item.meta && <p className="text-sm text-muted">{entry.item.meta}</p>}
                {entry.item.detail && <p className="mt-2 text-[15px] leading-relaxed text-body">{entry.item.detail}</p>}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
