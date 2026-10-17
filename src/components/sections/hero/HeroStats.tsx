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
  // frase se leía como un campo vacío al lado de los otros dos. Las
  // tecnologías se cuentan sobre los `stack` reales (sin repetir), así que
  // el número es exactamente el que el visitante puede auditar en el mapa
  // de skills de más abajo — y sube solo al cargar el próximo proyecto.
  const technologies = new Set(PROJECTS.flatMap((project) => project.stack)).size;

  return (
    <div className="mt-4 flex divide-x divide-border/15 rounded-lg border border-border/15 bg-background/50 py-2.5 tabular-nums md:mt-6 md:rounded-none md:border-0 md:bg-transparent md:py-0">
      {/* En teléfono la tira es la "tabla de datos" de la credencial (caja con
          borde, tres celdas que se reparten el ancho); en escritorio, suelta.
          whitespace-nowrap: a 390px la tira tiene ~342px útiles y los rótulos
          largos partidos dejaban columnas de alturas distintas; el ajuste
          tiene que ser de tamaño y no de saltos de línea. */}
      <a
        href="#proyectos"
        className="group flex flex-1 flex-col gap-1 px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary md:flex-none md:pl-0 md:pr-5"
      >
        <span className="font-display text-xl font-bold text-brand-primary md:text-3xl">
          {projects}
        </span>
        <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.06em] min-[380px]:tracking-[0.12em] text-muted transition group-hover:text-brand-primary md:text-[10px] md:tracking-[0.2em]">
          Proyectos
        </span>
      </a>

      <div className="flex flex-1 flex-col gap-1 px-2 md:flex-none md:px-5">
        <span className="font-display text-xl font-bold text-heading md:text-3xl">
          +{years}
        </span>
        <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.06em] min-[380px]:tracking-[0.12em] text-muted md:text-[10px] md:tracking-[0.2em]">
          Años programando
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 md:flex-none md:pl-5 md:pr-0">
        <span className="font-display text-xl font-bold text-heading md:text-3xl">
          {technologies}
        </span>
        <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.06em] min-[380px]:tracking-[0.12em] text-muted md:text-[10px] md:tracking-[0.2em]">
          Tecnologías
        </span>
      </div>
    </div>
  );
}
