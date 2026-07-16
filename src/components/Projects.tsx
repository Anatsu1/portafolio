import { ExternalLink, Github } from "lucide-react";
import { PROJECTS } from "../data";

export default function Projects() {
  return (
    <section id="proyectos" className="section-shell">
      <p className="eyebrow">Proyectos</p>
      <h2 className="section-title">Trabajos recientes</h2>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => (
          <article key={project.title} className="card flex flex-col">
            <h3 className="font-display text-lg font-semibold text-white">
              {project.title}
            </h3>
            <p className="mt-2 flex-1 text-sm text-slate-400">
              {project.description}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-300"
                >
                  {tag}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-4 border-t border-white/5 pt-4 text-sm">
              {project.demo && (
                <a
                  href={project.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-accent-400 transition hover:text-accent-300"
                >
                  <ExternalLink size={15} /> Demo
                </a>
              )}
              {project.repo && (
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-300 transition hover:text-white"
                >
                  <Github size={15} /> Código
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
