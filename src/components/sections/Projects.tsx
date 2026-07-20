import { motion } from "motion/react";
import { ExternalLink, Github, Search } from "lucide-react";
import { PROJECTS } from "../../data";
import { useProjectFilter } from "../../hooks/useProjectFilter";
import { Reveal, containerVariants, itemVariants } from "../Reveal";

export default function Projects() {
  const { query, setQuery, filtered, allTags } = useProjectFilter(PROJECTS);

  return (
    <section id="proyectos" className="section-shell">
      <Reveal>
        <p className="eyebrow text-brand-projects">Proyectos</p>
        <h2 className="section-title">Trabajos recientes</h2>
      </Reveal>

      <Reveal delay={0.1} className="mt-8 space-y-4">
        <label className="relative block max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por tecnología (ej. React, Docker)"
            className="w-full rounded-xl border border-border/10 bg-surface/70 py-2.5 pl-10 pr-4 text-sm text-body placeholder:text-muted transition focus:border-brand-projects/60 focus:outline-none focus:ring-2 focus:ring-brand-projects/30"
          />
        </label>

        <ul className="flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = query.toLowerCase() === tag.toLowerCase();
            return (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => setQuery(active ? "" : tag)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-brand-projects text-white"
                      : "bg-brand-projects/10 text-brand-projects hover:bg-brand-projects/20"
                  }`}
                >
                  {tag}
                </button>
              </li>
            );
          })}
        </ul>
      </Reveal>

      {filtered.length === 0 && (
        <p className="mt-10 text-sm text-muted">
          No se encontraron proyectos con esa tecnología.
        </p>
      )}

      <motion.div
        className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        {filtered.map((project) => (
          <motion.article key={project.title} className="card flex flex-col" variants={itemVariants}>
            <h3 className="font-display text-lg font-semibold text-heading">
              {project.title}
            </h3>
            <p className="mt-2 flex-1 text-sm text-muted">
              {project.description}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-brand-projects/10 px-3 py-1 text-xs font-medium text-brand-projects"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-4 border-t border-border/5 pt-4 text-sm">
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-projects transition hover:opacity-80"
                >
                  <ExternalLink size={15} /> Demo
                </a>
              )}
              {project.repo && (
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-body transition hover:text-heading"
                >
                  <Github size={15} /> Código
                </a>
              )}
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
