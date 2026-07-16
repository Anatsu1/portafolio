import { Code2, Rocket, Users } from "lucide-react";
import { OWNER } from "../data";

const HIGHLIGHTS = [
  {
    icon: Code2,
    title: "Código limpio",
    text: "Tipado estricto, componentes reutilizables y pruebas automatizadas.",
  },
  {
    icon: Rocket,
    title: "Rendimiento",
    text: "Interfaces rápidas, optimizadas para Core Web Vitals y SEO.",
  },
  {
    icon: Users,
    title: "Trabajo en equipo",
    text: "Experiencia en metodologías ágiles, code reviews y mentoría.",
  },
];

export default function About() {
  return (
    <section id="sobre-mi" className="section-shell">
      <p className="eyebrow">Sobre mí</p>
      <h2 className="section-title">Quién soy y cómo trabajo</h2>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4 text-slate-400">
          <p>
            Soy {OWNER.name}, desarrollador de software enfocado en el
            ecosistema JavaScript/TypeScript. Me especializo en construir
            aplicaciones web completas: desde interfaces con React y Tailwind
            hasta APIs con Node.js.
          </p>
          <p>
            Me apasiona convertir problemas complejos en soluciones simples y
            bien diseñadas, cuidando tanto la experiencia de usuario como la
            calidad del código que queda detrás.
          </p>
          <p>
            Actualmente estoy abierto a nuevas oportunidades y colaboraciones
            en proyectos freelance o de tiempo completo.
          </p>
        </div>

        <div className="grid gap-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card flex items-start gap-4">
              <span className="rounded-xl bg-accent-500/15 p-3 text-accent-400">
                <Icon size={22} />
              </span>
              <div>
                <h3 className="font-display font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
