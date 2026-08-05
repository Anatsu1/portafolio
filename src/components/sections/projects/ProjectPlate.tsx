import { useLayoutEffect, useRef, useState } from "react";
import { ExternalLink, Github, Stamp } from "lucide-react";
import type { Project } from "../../../data/projects";
import ProjectCarousel from "./ProjectCarousel";

/** Estado de la ficha respecto del filtro de la red de skills:
 *  "none" = sin filtro activo, "match" = usa alguna tecnología seleccionada,
 *  "miss" = no usa ninguna (se atenúa, nunca se desmonta — grilla estable). */
export type PlateFilterState = "none" | "match" | "miss";

const STATUS_LABEL: Record<Project["status"], string> = {
  activo: "Activo",
  "en-progreso": "En progreso",
  preview: "Preview",
};

const ROLE_LABEL: Record<Project["role"], string> = {
  cliente: "Cliente",
  personal: "Personal",
  formacion: "Formación",
};

// Sello de la esquina de la ficha (null = sin sello). Va DERECHO: girado
// se leía como calcomanía y peleaba con la grilla de plano técnico, donde
// todo está a escuadra.
// "Certificación" y no "Curso": suelto, "curso" se lee como "en curso" y
// daba a entender que el proyecto estaba a medio hacer.
const STAMP_LABEL: Record<Project["role"], string | null> = {
  cliente: "Cliente",
  personal: "Personal",
  formacion: "Certificación",
};

// Marcas de esquina — puro CSS anclado a las 4 esquinas de la propia
// ficha (no a un punto en movimiento como el marcador descartado del
// Hero): funciona igual en cualquier tamaño de pantalla, sin cálculo.
const CORNERS = [
  "left-0 top-0 border-l border-t",
  "right-0 top-0 border-r border-t",
  "left-0 bottom-0 border-l border-b",
  "right-0 bottom-0 border-r border-b",
];

const FILTER_CLASSES: Record<PlateFilterState, string> = {
  none: "border-border/20",
  match: "border-brand-skills/40",
  miss: "border-border/20 opacity-40 saturate-50",
};

type ProjectPlateProps = {
  project: Project;
  /** N.º del cajetín — puramente decorativo (estética de plano técnico). */
  index: number;
  filterState?: PlateFilterState;
};

export default function ProjectPlate({
  project,
  index,
  filterState = "none",
}: ProjectPlateProps) {
  // El resumen se recorta a 3 renglones con un "Ver más" en TODAS las
  // resoluciones — así todas las fichas del slider arrancan la media a la
  // misma altura y miden parejo. Si de verdad desborda se detecta midiendo
  // el propio <p> (scrollHeight vs clientHeight); expandir agranda solo
  // esa ficha (el resto no se mueve).
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = summaryRef.current;
    if (!el) return;
    const check = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  // El hover levanta la ficha, le sube el relleno y le tira una sombra en el
  // color de la sección: tiene que notarse que la ficha es la unidad con la
  // que se interactúa. Ojo, el lift y la sombra necesitan aire vertical en
  // el slider (`py` compensado con `-mb`, en Projects.tsx): ese contenedor
  // scrollea en x, así que en y recorta. El `group` es para que las marcas
  // de esquina se enciendan junto con la ficha.
  return (
    <article
      className={`group relative flex h-full flex-col rounded-sm border bg-surface/60 p-6 transition duration-300 hover:-translate-y-1.5 hover:border-heading/40 hover:bg-surface hover:shadow-[0_14px_40px_-16px_rgb(var(--color-brand-projects)/0.6)] md:p-8 ${FILTER_CLASSES[filterState]}`}
    >
      {CORNERS.map((corner) => (
        <span
          key={corner}
          aria-hidden
          className={`pointer-events-none absolute h-3 w-3 border-heading/25 transition-colors duration-300 group-hover:border-brand-projects ${corner}`}
        />
      ))}

      {STAMP_LABEL[project.role] && (
        <div
          aria-hidden
          className="absolute right-4 top-4 flex items-center gap-1 rounded-full border-2 border-brand-projects/50 px-2.5 py-1 text-brand-projects md:right-6 md:top-6"
        >
          <Stamp size={13} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {STAMP_LABEL[project.role]}
          </span>
        </div>
      )}

      {/* Composición de zonas con altura FIJA de verdad (h-*, no min-h:
          min-h reserva un mínimo pero deja crecer — un stack o título que
          envuelve un renglón extra corría todo lo de abajo). Cada zona
          ocupa SIEMPRE lo mismo, ocupe lo que ocupe el contenido: la media
          y la tira FIG caen a la misma altura en todas las fichas y el
          slider no salta al navegar. La única variación permitida es
          expandir "Ver más" (acción del usuario, agranda solo esa ficha). */}

      {/* Cajetín: h fija, medida contra el PEOR caso real (un stack de 6
          tecnologías, hoy la UTN) en el ancho más angosto — no calculada a
          ojo. Mobile: 2 renglones de metadatos + 3 de stack = 116px. Desde
          md: los metadatos entran en un renglón y el stack en dos = 68px.
          El hueco para el sello (pr-24) va SÓLO en la fila de metadatos:
          el sello está pegado arriba a la derecha y no llega a la línea del
          stack — aplicarlo al cajetín entero le comía 96px de ancho al
          stack y lo recortaba a mitad de tecnología. */}
      <div className="flex h-[7.25rem] flex-col gap-1.5 overflow-hidden border-b border-border/10 pb-3 text-[11px] uppercase tracking-wide text-muted md:h-[4.25rem]">
        <div
          className={`flex flex-wrap gap-x-4 gap-y-1.5 ${
            STAMP_LABEL[project.role] ? "pr-24 md:pr-0" : ""
          }`}
        >
          <span>
            Rol <span className="text-body">{ROLE_LABEL[project.role]}</span>
          </span>
          <span>
            Estado <span className="text-body">{STATUS_LABEL[project.status]}</span>
          </span>
          <span>
            N.º <span className="text-body">{String(index + 1).padStart(2, "0")}</span>
          </span>
        </div>
        {/* Tecnologías en el color de la sección — la skill usada se
            resalta a simple vista dentro del cajetín. */}
        <div>
          Stack{" "}
          {project.stack.map((tech, i) => (
            <span key={tech}>
              {i > 0 && " · "}
              <span className="font-medium text-brand-projects">{tech}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Título: h fija de exactamente 2 renglones (em: escala con el
          font-size del breakpoint). text-lg en mobile para que títulos
          largos entren en 2 renglones y no se recorten. */}
      <h3 className="mt-4 h-[2.8em] overflow-hidden font-display text-lg font-semibold leading-[1.4] text-heading md:text-2xl">
        {project.title}
      </h3>
      {/* Resumen: h fija de exactamente 3 renglones (clamp recorta el
          texto; la h mantiene la zona aunque el texto sea más corto).
          Expandido pasa a min-h y crece solo esta ficha. */}
      <p
        ref={summaryRef}
        className={`mt-3 text-sm leading-relaxed text-body ${
          expanded ? "min-h-[4.875em]" : "h-[4.875em] overflow-hidden line-clamp-3"
        }`}
      >
        {project.summary}
      </p>
      {/* Slot fijo del "Ver más": ocupa su altura aunque el texto no
          desborde — el botón aparece/desaparece sin mover la media. */}
      <div className="mt-1.5 h-5">
        {(clamped || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-brand-projects transition hover:opacity-80"
          >
            {expanded ? "Ver menos" : "Ver más"}
          </button>
        )}
      </div>

      {project.media.length > 0 && (
        <div className="mb-5 mt-5">
          <ProjectCarousel media={project.media} title={project.title} />
        </div>
      )}

      {/* mt-auto: los links quedan anclados al borde inferior de la ficha —
          todas las fichas del slider cierran igual, sobre lo que sobre.
          La tira se renderiza SIEMPRE (composición idéntica entre fichas);
          sin demo ni repo muestra un guion, como campo vacío de plano. */}
      <div className="mt-auto flex min-h-[1.25rem] items-center gap-4 border-t border-border/5 pt-4 text-sm">
        {!project.links.demo && !project.links.repo && (
          <span aria-hidden className="text-muted">
            —
          </span>
        )}
        {project.links.demo && (
          <a
            href={project.links.demo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-brand-projects transition hover:opacity-80"
          >
            <ExternalLink size={15} /> Demo
          </a>
        )}
        {project.links.repo && (
          <a
            href={project.links.repo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-body transition hover:text-heading"
          >
            <Github size={15} /> Código
          </a>
        )}
      </div>
    </article>
  );
}
