import { OWNER } from "../../../data";
import { PROJECTS } from "../../../data/projects";

/**
 * Tira de tres métricas del Hero (proyectos, años programando y clientes) —
 * la prueba rápida de volumen de trabajo que ven las dos audiencias del
 * portafolio (empresas y clientes particulares) antes de scrollear. El primer
 * dato es un link a #proyectos: además de informar, es la entrada a la
 * sección. No recibe props: ambos números se derivan de `data.ts` (nunca
 * escritos a mano), así no envejecen solos.
 */
export default function HeroStats() {
  const years = new Date().getFullYear() - OWNER.codingSince;
  const projects = String(PROJECTS.length).padStart(2, "0");
  // Los tres datos son números por algo: uno solo que fuera un símbolo o una
  // frase se leía como un campo vacío al lado de los otros dos. Cuántos son
  // para clientes reales sale del `role` de cada proyecto, así que sube solo
  // al cargar el próximo trabajo pago.
  const clients = String(
    PROJECTS.filter((project) => project.role === "cliente").length
  ).padStart(2, "0");

  return (
    <div className="mt-6 flex divide-x divide-border/15">
      <a
        href="#proyectos"
        className="group flex flex-col gap-1 pr-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
      >
        <span className="font-display text-2xl font-bold text-brand-primary md:text-3xl">
          {projects}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted transition group-hover:text-brand-primary">
          Proyectos
        </span>
      </a>

      <div className="flex flex-col gap-1 px-5">
        <span className="font-display text-2xl font-bold text-heading md:text-3xl">
          +{years}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
          Años programando
        </span>
      </div>

      <div className="flex flex-col gap-1 pl-5">
        <span className="font-display text-2xl font-bold text-heading md:text-3xl">
          {clients}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">
          Para clientes
        </span>
      </div>
    </div>
  );
}
