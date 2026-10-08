import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Copy, Download, Github, Linkedin, Mail, X } from "lucide-react";
import { CELL_BOXES, type PanelBlock } from "../../../data/cell";
import { PROJECTS } from "../../../data/projects";
import { OWNER } from "../../../data";
import { HOLD_AUTO_S } from "./cellLayout";

// El ancho debe coincidir con PANEL_MAX_PX / PANEL_MAX_FRAC de ViewShift.
const PANEL_WIDTH = "min(420px, 42%)";

const ROLE_LABEL = { cliente: "Cliente", personal: "Personal", formacion: "Certificación" } as const;

type SidePanelProps = {
  index: number;
  /** En automático hay cuenta regresiva; en manual se queda hasta cerrarlo. */
  auto: boolean;
  onClose: () => void;
  /** El visitante está leyendo: frena la cuenta regresiva. */
  onReading: (reading: boolean) => void;
};

function Block({ block }: { block: PanelBlock }) {
  return (
    <section className="mt-5 first:mt-0">
      {block.heading && (
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{block.heading}</h4>
      )}
      <ul className="space-y-3">
        {block.items.map((item) => (
          <li key={item.title} className="border-l-2 border-brand-primary/40 pl-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-heading">
              {item.title}
              {item.badge && (
                <span className="rounded bg-brand-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                  {item.badge}
                </span>
              )}
            </p>
            {item.meta && <p className="text-xs text-muted">{item.meta}</p>}
            {item.detail && <p className="mt-1 text-[13px] leading-snug text-body">{item.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectsBlock() {
  return (
    <ul className="mt-5 space-y-3">
      {PROJECTS.slice(0, 6).map((p) => (
        <li key={p.id} className="border-l-2 border-brand-projects/50 pl-3">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-heading">
            {p.title}
            <span className="rounded bg-brand-projects/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-projects">
              {ROLE_LABEL[p.role]}
            </span>
          </p>
          <p className="text-xs text-muted">{p.stack.slice(0, 5).join(" · ")}</p>
        </li>
      ))}
    </ul>
  );
}

function ContactBlock() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(OWNER.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sin permiso de portapapeles: el correo sigue visible para copiarlo */
    }
  };
  const link =
    "flex items-center gap-2 rounded-lg border border-border/10 bg-surface/60 px-3 py-2 text-sm text-body transition hover:border-brand-primary/60 hover:text-brand-primary";
  return (
    <div className="mt-5 space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-heading">
          <Mail size={16} className="shrink-0 text-brand-primary" />
          <span className="select-text truncate">{OWNER.email}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <a href={OWNER.github} target="_blank" rel="noreferrer" className={link}>
        <Github size={16} /> GitHub
      </a>
      <a href={OWNER.linkedin} target="_blank" rel="noreferrer" className={link}>
        <Linkedin size={16} /> LinkedIn
      </a>
      <a href={OWNER.cvUrl} download className={link}>
        <Download size={16} /> Descargar CV
      </a>
    </div>
  );
}

/**
 * Panel lateral de la celda (estilo HUD). Se abre cuando el brazo deja una
 * caja en la plataforma. Su contenido sale de `data/cell.ts`; los proyectos y
 * los enlaces de contacto, de `PROJECTS` y `OWNER`, así no se duplican.
 */
export default function SidePanel({ index, auto, onClose, onReading }: SidePanelProps) {
  const box = CELL_BOXES[index];
  const ref = useRef<HTMLElement>(null);
  const [reading, setReading] = useState(false);
  const read = (value: boolean) => {
    setReading(value);
    onReading(value);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // En manual el visitante ya interactuó: lleva el foco al panel (teclado y lectores).
  useEffect(() => {
    if (!auto) ref.current?.focus({ preventScroll: true });
  }, [auto, index]);

  if (!box) return null;
  const { panel } = box;

  return (
    <motion.aside
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label={panel.title}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => read(true)}
      onMouseLeave={() => read(false)}
      onFocus={() => read(true)}
      onBlur={() => read(false)}
      style={{ width: PANEL_WIDTH }}
      className="absolute bottom-3 right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-brand-primary/30 bg-background/90 shadow-2xl shadow-black/30 backdrop-blur-md focus:outline-none"
    >
      <header className="relative border-b border-border/10 px-5 pb-4 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary">
          {panel.kicker} · {String(index + 1).padStart(2, "0")} / {String(CELL_BOXES.length).padStart(2, "0")}
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold text-heading">{panel.title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted transition hover:bg-heading/10 hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
        >
          <X size={18} />
        </button>
        {auto && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border/10" aria-hidden>
            <div
              key={index}
              className="h-full origin-left bg-brand-primary"
              style={{
                animation: `countdown ${HOLD_AUTO_S}s linear forwards`,
                animationPlayState: reading ? "paused" : "running",
              }}
            />
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {panel.intro && <p className="text-sm leading-relaxed text-body">{panel.intro}</p>}
        {box.id === "proyectos" && <ProjectsBlock />}
        {box.id === "contacto" && <ContactBlock />}
        {panel.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>

      <footer className="border-t border-border/10 p-4">
        <a
          href={`#${box.target}`}
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {box.cta} <ArrowRight size={16} />
        </a>
      </footer>
    </motion.aside>
  );
}
