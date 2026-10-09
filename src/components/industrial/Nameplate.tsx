import { motion } from "motion/react";
import { OWNER } from "../../data";
import Rivets from "./Rivets";
import WeldLine from "./WeldLine";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

// Datos de la "placa de fabricante": sale de OWNER y de lo que ya muestra el sitio.
function rows() {
  const years = new Date().getFullYear() - OWNER.codingSince;
  return [
    ["Modelo", OWNER.shortName],
    ["Función", OWNER.role],
    ["Fabricación", `${OWNER.codingSince} · ${years} años en servicio`],
    ["Origen", OWNER.location],
    ["Estado", "Operativo · abierto a proyectos"],
  ] as const;
}

/**
 * Placa de fabricante, como la que traen las máquinas industriales: acero con
 * remaches y los datos grabados (modelo, función, año, origen, estado). Es el
 * remate antes de Contacto: un objeto que resume quién es el "equipo" que se
 * va a contratar, en el idioma del resto del sitio. Los datos salen de `OWNER`.
 */
export default function Nameplate() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10">
      <motion.div
        className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border-2 border-border/30 bg-gradient-to-b from-surface to-background p-6 shadow-[0_18px_44px_-24px_rgb(var(--color-heading)/0.5),inset_0_1px_0_rgb(var(--color-heading)/0.14)] md:p-8"
        initial={{ opacity: 0, y: 28, rotate: -0.6 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <Rivets />
        <p className="text-center font-display text-[11px] font-bold uppercase tracking-[0.34em] text-muted">
          Placa de características
        </p>
        <WeldLine className="mx-auto my-4 w-40" delay={0.3} />
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
          {rows().map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted sm:pt-0.5">{label}</dt>
              <dd className="font-mono text-sm font-semibold uppercase tracking-wide text-heading">{value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}
