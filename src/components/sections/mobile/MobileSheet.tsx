import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useDragControls } from "motion/react";
import { ArrowRight, Check, Copy, Download, Github, Linkedin, Mail, X } from "lucide-react";
import { CELL_BOXES, type PanelBlock } from "../../../data/cell";
import { PROJECTS } from "../../../data/projects";
import { OWNER } from "../../../data";
import type { CellIconId } from "../../../data/cellIcons";
import CellIcon from "../celda/CellIcon";

/**
 * Hoja inferior (bottom sheet) del laboratorio 2D: el equivalente móvil del
 * `SidePanel` del 3D, con el mismo contenido (`CELL_BOXES[i].panel`, los
 * proyectos y los enlaces de contacto).
 *
 * Los bloques (`Block`, `ProjectsBlock`, `ContactBlock`) están duplicados del
 * SidePanel a propósito: allá no se exportan y ese archivo es del 3D. Si
 * cambia el contenido de uno, revisar el otro (o exportarlos desde SidePanel y
 * borrar estos).
 *
 * Se cierra con la X, con Esc, tocando afuera o arrastrándola hacia abajo
 * desde la manija/cabecera (el cuerpo scrollea normal: arrastrar desde ahí no
 * la cierra, para no pelear con la lectura).
 */

const ROLE_LABEL = { cliente: "Cliente", personal: "Personal", formacion: "Certificación" } as const;

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
    "flex min-h-[44px] items-center gap-2 rounded-lg border border-border/10 bg-surface/60 px-3 py-2 text-sm text-body transition hover:border-brand-primary/60 hover:text-brand-primary";
  return (
    <div className="mt-5 space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2 text-sm text-heading">
          <Mail size={16} className="shrink-0 text-brand-primary" />
          <span className="select-text truncate">{OWNER.email}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex min-h-[44px] shrink-0 items-center gap-1 rounded px-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/10"
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

type MobileSheetProps = {
  index: number;
  onClose: () => void;
};

export default function MobileSheet({ index, onClose }: MobileSheetProps) {
  const box = CELL_BOXES[index];
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDragControls();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // El foco entra a la hoja al abrirse y vuelve a donde estaba al cerrarse.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  if (!box) return null;
  const { panel } = box;

  return createPortal(
    <>
      {/* Fondo: oscurece sólo hacia abajo, así arriba se sigue viendo la caja abierta. */}
      <motion.div
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-gradient-to-b from-transparent via-black/20 to-black/50"
      />
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={panel.title}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 1 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 90 || info.velocity.y > 500) onClose();
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[62svh] flex-col rounded-t-2xl border-t-2 border-brand-primary/50 bg-background/95 shadow-[0_-18px_40px_-12px_rgb(0_0_0/0.45)] backdrop-blur-md focus:outline-none"
      >
        <header
          onPointerDown={(e) => drag.start(e)}
          className="relative cursor-grab touch-none select-none border-b border-border/10 px-5 pb-3 pt-2"
        >
          <span aria-hidden className="mx-auto mb-2 block h-1 w-10 rounded-full bg-muted/40" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-primary">
            {panel.kicker} · {String(index + 1).padStart(2, "0")} / {String(CELL_BOXES.length).padStart(2, "0")}
          </p>
          <h3 className="mt-1 flex items-center gap-2.5 pr-12 font-display text-xl font-bold text-heading">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-primary/60 bg-brand-primary/10 text-brand-primary">
              <CellIcon id={box.id as CellIconId} size={22} />
            </span>
            {panel.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Cerrar panel"
            className="absolute right-2 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-muted transition hover:bg-heading/10 hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {panel.intro && <p className="text-sm leading-relaxed text-body">{panel.intro}</p>}
          {box.id === "proyectos" && <ProjectsBlock />}
          {box.id === "contacto" && <ContactBlock />}
          {panel.blocks.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </div>

        <footer className="border-t border-border/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <a
            href={`#${box.target}`}
            onClick={onClose}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            {box.cta} <ArrowRight size={16} />
          </a>
        </footer>
      </motion.div>
    </>,
    document.body
  );
}
