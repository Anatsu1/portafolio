import { useState } from "react";
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
 * Placa de fabricante, como la que traen las máquinas industriales: acero
 * cepillado con bisel, remaches y los datos grabados en bajo relieve (modelo,
 * función, año, origen, estado). El brillo sigue al mouse y pasa una vez al
 * aparecer. Es el remate antes de Contacto: un objeto que resume quién es el
 * "equipo" que se va a contratar, en el idioma del resto del sitio. Los datos
 * salen de `OWNER`. El acero no depende del tema: es metal en claro y oscuro.
 */
export default function Nameplate() {
  const [sheen, setSheen] = useState({ x: 28, y: 18 });

  // Acero cepillado: reflejo que sigue al puntero + vetas finas + degradado metálico.
  const steel = `radial-gradient(120% 95% at ${sheen.x}% ${sheen.y}%, rgba(255,255,255,0.55), transparent 52%), repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1px, rgba(0,0,0,0.04) 1px 3px), linear-gradient(135deg, #aeb7bd 0%, #7d878e 26%, #c3cacf 48%, #838d94 72%, #a5aeb4 100%)`;
  const engraved = { textShadow: "0 1px 0 rgba(255,255,255,0.55), 0 -1px 0 rgba(0,0,0,0.35)" } as const;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10">
      <motion.div
        className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/40 p-6 shadow-[0_22px_48px_-22px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-3px_6px_rgba(0,0,0,0.4)] md:p-8"
        style={{ background: steel }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setSheen({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        initial={{ opacity: 0, y: 28, rotate: -0.6 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {/* Destello que cruza la placa al aparecer */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          initial={{ x: "-120%" }}
          whileInView={{ x: "420%" }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.3, delay: 0.5, ease: "easeInOut" }}
        />
        <Rivets />
        <p
          className="text-center font-display text-[11px] font-bold uppercase tracking-[0.34em] text-[#2a3137]"
          style={engraved}
        >
          Placa de características
        </p>
        <WeldLine className="mx-auto my-4 w-40" delay={0.3} />
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
          {rows().map(([label, value]) => (
            <div key={label} className="contents">
              <dt
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#2b3238] sm:pt-0.5"
                style={engraved}
              >
                {label}
              </dt>
              <dd className="font-mono text-sm font-bold uppercase tracking-wide text-[#161b1f]" style={engraved}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}
