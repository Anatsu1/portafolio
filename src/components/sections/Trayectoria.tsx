import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { CURRENT_FRONTS, TIMELINE } from "../../data/timeline";
import CellIcon from "./celda/CellIcon";
import Rivets from "../industrial/Rivets";
import type { CellIconId } from "../../data/cellIcons";
import SectionHeading from "../SectionHeading";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const KIND_LABEL = { educacion: "Educación", experiencia: "Experiencia" } as const;

const SPARKS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * Hito soldado a la columna: cuando el cordón llega, el rombo se asienta con un
 * golpe, brilla al rojo vivo, suelta chispas y se enfría hasta quedar fijo como
 * acero. Se dispara una sola vez, cuando el hito pasa por el 65 % de la altura
 * de la pantalla (donde está el cordón de la columna).
 */
function WeldNode({ featured }: { featured?: boolean }) {
  const viewport = { once: true, amount: 1, margin: "0px 0px -35% 0px" } as const;
  return (
    <span aria-hidden className="absolute left-3 top-1.5 -translate-x-1/2 md:left-1/2">
      <span className="relative block h-4 w-4">
        {/* El rombo: se asienta con rebote y queda */}
        <motion.span
          className={`absolute inset-0 rotate-45 rounded-sm border-2 border-brand-primary ${
            featured ? "bg-brand-primary" : "bg-background"
          }`}
          initial={{ scale: 0.2 }}
          whileInView={{ scale: [0.2, 1.45, 0.92, 1] }}
          viewport={viewport}
          transition={{ duration: 0.7, times: [0, 0.4, 0.75, 1], ease: "easeOut" }}
        />
        {/* Brasa: al rojo vivo y se apaga hasta ser acero */}
        <motion.span
          className="absolute -inset-1 rotate-45 rounded-sm bg-[#ff7a1a] shadow-[0_0_16px_6px_rgba(255,90,31,0.85)] mix-blend-screen"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: [0, 1, 0.75, 0] }}
          viewport={viewport}
          transition={{ duration: 2.2, times: [0, 0.12, 0.45, 1], ease: "easeOut" }}
        />
        {/* Chispas */}
        {SPARKS.map((n) => {
          const angle = (n / SPARKS.length) * Math.PI * 2 + 0.3;
          const dist = 20 + (n % 3) * 7;
          return (
            <motion.span
              key={n}
              className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-[#ffd27a] shadow-[0_0_6px_2px_rgba(255,170,60,0.9)]"
              initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
              whileInView={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist + 6,
                opacity: [0, 1, 0],
                scale: [1, 1, 0.3],
              }}
              viewport={viewport}
              transition={{ duration: 0.8 + (n % 3) * 0.12, ease: "easeOut" }}
            />
          );
        })}
      </span>
    </span>
  );
}

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
  const headTop = useTransform(spine, (v) => `${v * 100}%`);

  return (
    <section id="trayectoria" className="section-shell">
      <SectionHeading
        index="03"
        eyebrow="Trayectoria"
        title="Dónde estudié y en qué trabajé"
        subtitle="De dónde vengo y hacia dónde voy: siete años entre el aula, el freelance y la docencia. Lo estudiado se declara en curso; lo construido se muestra en Proyectos."
      />

      {/* Hoy: los tres frentes, uno tras otro y con la misma jerarquía. */}
      <div className="mt-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Hoy combino tres frentes</p>
        <ol className="grid gap-4 md:grid-cols-3">
          {CURRENT_FRONTS.map((front, i) => {
            const icon: CellIconId = i === 0 ? "proyectos" : i === 1 ? "experiencia" : "educacion";
            return (
              <motion.li
                key={front.item.title}
                className="relative overflow-hidden rounded-2xl border border-brand-primary/30 bg-surface/60 p-5"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-brand-primary" />
                <Rivets />
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-primary bg-brand-primary/10 text-brand-primary">
                    <CellIcon id={icon} size={22} />
                  </span>
                  <span className="font-display text-xs font-bold tabular-nums text-muted">0{i + 1}</span>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
                  {front.when}
                  {front.item.badge ? ` · ${front.item.badge}` : ""}
                </p>
                <h3 className="mt-1 font-display text-lg font-bold leading-snug text-heading">{front.item.title}</h3>
                {front.item.meta && <p className="text-sm text-muted">{front.item.meta}</p>}
                {front.item.detail && <p className="mt-2 text-[15px] leading-relaxed text-body">{front.item.detail}</p>}
              </motion.li>
            );
          })}
        </ol>
      </div>

      <ol ref={listRef} className="relative mt-16 space-y-10 md:space-y-14">
        {/* Columna: acero frío de fondo y, encima, el cordón de soldadura que avanza con
            el scroll: acero ya enfriado atrás y el punto incandescente en la cabeza. */}
        <div aria-hidden className="absolute bottom-0 left-3 top-0 w-[3px] -translate-x-1/2 rounded-full bg-border/20 md:left-1/2">
          <motion.div
            style={{
              scaleY: spine,
              background: "linear-gradient(to bottom, rgb(var(--color-brand-primary) / 0.55) 0%, rgb(var(--color-brand-primary) / 0.9) 70%, #e8350f 94%, #ffb347 100%)",
            }}
            className="h-full w-full origin-top rounded-full"
          />
          <motion.span
            style={{ top: headTop }}
            className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff1c2] shadow-[0_0_14px_5px_rgba(255,122,26,0.95)]"
          />
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
              transition={{ type: "spring", stiffness: 220, damping: 19 }}
            >
              <WeldNode featured={entry.featured} />
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
                <h3
                  className={`mt-1.5 font-display font-bold text-heading ${
                    entry.featured ? "text-xl text-brand-primary md:text-2xl" : "text-lg md:text-xl"
                  }`}
                >
                  {entry.item.title}
                </h3>
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
