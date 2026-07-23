import { useMemo } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PROJECTS } from "../../data/projects";
import { resolveStack } from "../../data/skillTree";
import { useSkillTree } from "../../hooks/useSkillTree";
import { useProjectSlider } from "../../hooks/useProjectSlider";
import { Reveal, containerVariants, itemVariants } from "../Reveal";
import ProjectPlate, { type PlateFilterState } from "./projects/ProjectPlate";
import SkillTree from "./projects/SkillTree";

// Destacados primero (orden estable en el resto).
const ORDERED_PROJECTS = [...PROJECTS].sort(
  (a, b) => Number(b.featured) - Number(a.featured)
);
const ORDERED_IDS = ORDERED_PROJECTS.map((p) => p.id);

// Los stacks no cambian en runtime: se resuelven una sola vez.
const NODE_IDS_BY_PROJECT = new Map(
  ORDERED_PROJECTS.map((p) => [p.id, resolveStack(p.stack)])
);

export default function Projects() {
  const { selected, toggle, clear } = useSkillTree();

  // Filtro ANY: la ficha matchea si alguna de sus tecnologías está
  // seleccionada. Sin selección no hay filtro (todas normales). Las que no
  // matchean se atenúan, nunca se desmontan — la grilla queda estable.
  const filterStates = useMemo(() => {
    const states = new Map<string, PlateFilterState>();
    for (const project of ORDERED_PROJECTS) {
      if (selected.size === 0) {
        states.set(project.id, "none");
      } else {
        const nodeIds = NODE_IDS_BY_PROJECT.get(project.id) ?? [];
        states.set(project.id, nodeIds.some((id) => selected.has(id)) ? "match" : "miss");
      }
    }
    return states;
  }, [selected]);

  const matchedCount = useMemo(
    () => [...filterStates.values()].filter((s) => s === "match").length,
    [filterStates]
  );

  const { containerRef, registerPlate, index, atStart, atEnd, goTo, next, prev } =
    useProjectSlider(ORDERED_IDS, filterStates, selected.size > 0);

  return (
    <section id="proyectos" className="section-shell">
      <Reveal>
        <p className="eyebrow text-brand-projects">Proyectos</p>
        <h2 className="section-title">Trabajos y las skills detrás de cada uno</h2>
      </Reveal>

      {/* Slider horizontal con scroll-snap nativo en TODAS las resoluciones
          (la sección mide siempre lo mismo, sumen los proyectos que sumen):
          en mobile cada ficha es un slide al 88% del ancho (asoma la
          siguiente); en lg: entran 2 por vista. Sin scrollbar — se navega
          con la tira de controles de abajo (desplazamiento animado vía
          useProjectSlider) o con swipe/rueda, que siguen funcionando. */}
      <motion.div
        ref={containerRef}
        className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:min-w-[88%] [&>*]:snap-start lg:gap-6 lg:[&>*]:min-w-[calc(50%-0.75rem)]"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        {ORDERED_PROJECTS.map((project, i) => (
          <motion.div
            key={project.id}
            ref={registerPlate(project.id)}
            variants={itemVariants}
          >
            <ProjectPlate
              project={project}
              index={i}
              filterState={filterStates.get(project.id)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Controles del slider — mismo lenguaje visual que la tira "FIG."
          del carrusel de capturas (chevrons + N.º + ticks clickeables). */}
      {ORDERED_PROJECTS.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={prev}
            disabled={atStart}
            aria-label="Proyecto anterior"
            className="p-2 text-muted transition hover:text-heading disabled:opacity-30 disabled:hover:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-projects"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-[10px] uppercase tracking-widest text-muted">
            N.º <span className="text-body">{String(index + 1).padStart(2, "0")}</span> /{" "}
            {String(ORDERED_PROJECTS.length).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            {ORDERED_PROJECTS.map((project, i) => (
              <button
                key={project.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir al proyecto ${project.title}`}
                aria-current={i === index}
                className={`h-1 w-3 transition ${
                  i === index ? "bg-brand-projects" : "bg-border/25 hover:bg-border/50"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            disabled={atEnd}
            aria-label="Proyecto siguiente"
            className="p-2 text-muted transition hover:text-heading disabled:opacity-30 disabled:hover:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-projects"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <Reveal delay={0.15} className="mt-16 border-t border-border/10 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Mapa de skills
        </p>
        <h3 className="mt-2 font-display text-lg font-semibold text-heading">
          Seleccioná tecnologías para filtrar los proyectos
        </h3>
        <p className="mt-1 text-sm text-muted">
          Algunas requieren desbloquear sus fundamentos primero — un clic enciende toda la
          cadena.
        </p>
        <div className="mt-8">
          <SkillTree
            selected={selected}
            matchedCount={matchedCount}
            onToggle={toggle}
            onClear={clear}
          />
        </div>
      </Reveal>
    </section>
  );
}
