import { useRef } from "react";
import { RotateCcw } from "lucide-react";
import { PROJECTS } from "../../../data/projects";
import { PROVEN_NODE_IDS, TIER_COUNT, TIERS } from "../../../data/skillTree";
import { useMeasuredEdges, type MeasuredEdge } from "../../../hooks/useMeasuredEdges";
import SkillNodeButton from "./SkillNodeButton";

type SkillTreeProps = {
  /** Elegidos a mano: lo único que filtra proyectos. */
  picked: Set<string>;
  /** `picked` + sus prerequisitos: lo que se ve encendido en la red. */
  selected: Set<string>;
  matchedCount: number;
  onToggle: (id: string) => void;
  onClear: () => void;
};

// Curva cuadrática entre dos centros de nodo, con el punto de control
// desplazado perpendicular al segmento — look de grafo/red, no de tabla.
// El signo alterna por índice para que aristas vecinas no se solapen.
// Determinístico (nada de aleatorio): mismo trazo en cada render.
function edgePath(edge: MeasuredEdge, index: number): string {
  const dx = edge.x2 - edge.x1;
  const dy = edge.y2 - edge.y1;
  const len = Math.hypot(dx, dy) || 1;
  const curve = Math.min(28, len * 0.18) * (index % 2 === 0 ? 1 : -1);
  const cx = (edge.x1 + edge.x2) / 2 + (-dy / len) * curve;
  const cy = (edge.y1 + edge.y2) / 2 + (dx / len) * curve;
  return `M ${edge.x1} ${edge.y1} Q ${cx} ${cy} ${edge.x2} ${edge.y2}`;
}

/**
 * Red de nodos de skills, estilo grafo: círculos con label debajo,
 * conectados por curvas SVG que unen los centros reales medidos del DOM
 * (ver useMeasuredEdges) — correctas en cualquier breakpoint por
 * construcción. Desktop: las fases son columnas (izq → der), cada una
 * centrada verticalmente y con un stagger horizontal alternado para que
 * no se lea como una tabla. Mobile: las fases son filas apiladas (arriba →
 * abajo), cada una centrada y sin wrap — aristas cortas, mayormente
 * verticales, nada de caos. Arista "energizada" (sólida, color de skills)
 * cuando sus dos extremos están seleccionados; punteada/apagada si no.
 *
 * La selección y el filtrado de fichas viven en Projects.tsx
 * (useSkillTree) — este componente solo renderiza y reporta clics.
 */
export default function SkillTree({
  picked,
  selected,
  matchedCount,
  onToggle,
  onClear,
}: SkillTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { measured, registerRef } = useMeasuredEdges(containerRef);

  const hasFilter = picked.size > 0;

  return (
    <div>
      <div ref={containerRef} className="relative">
        {measured.width > 0 && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={measured.width}
            height={measured.height}
            viewBox={`0 0 ${measured.width} ${measured.height}`}
            fill="none"
          >
            {measured.edges.map((edge, i) => {
              const energized = selected.has(edge.from) && selected.has(edge.to);
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={edgePath(edge, i)}
                  className={`transition-all ${
                    energized ? "stroke-brand-skills" : "stroke-border/25"
                  }`}
                  strokeWidth={energized ? 1.5 : 1}
                  strokeDasharray={energized ? undefined : "4 4"}
                />
              );
            })}
          </svg>
        )}

        {/* Las columnas salen de TIER_COUNT, no de una clase fija: sacar o
            agregar una fase del árbol no deja columnas vacías ni apretadas.
            Va inline porque Tailwind no puede generar `grid-cols-N` dinámico;
            en mobile no molesta (ahí el contenedor es flex-col, no grid). */}
        <div
          className="relative flex flex-col gap-10 md:grid md:gap-x-4"
          style={{ gridTemplateColumns: `repeat(${TIER_COUNT}, minmax(0, 1fr))` }}
        >
          {TIERS.map((tier, t) => (
            <div key={t} className="flex flex-col gap-3 md:gap-4">
              <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted">
                Fase {String(t).padStart(2, "0")}
              </p>
              {/* Mobile: fila que envuelve — hay tiers de ~7 nodos y a 375px
                  entran 4 por renglón; sin wrap la fase se saldría de
                  pantalla. Desktop: columna, un tier por columna. */}
              <div className="flex flex-row flex-wrap justify-center gap-x-2 gap-y-4 md:flex-1 md:flex-col md:flex-nowrap md:items-center md:justify-center md:gap-7">
                {tier.map((node, i) => (
                  <div
                    key={node.id}
                    className={i % 2 === 0 ? "md:-translate-x-3" : "md:translate-x-3"}
                  >
                    <SkillNodeButton
                      node={node}
                      picked={picked.has(node.id)}
                      selected={selected.has(node.id)}
                      locked={node.requires.some((req) => !selected.has(req))}
                      proven={PROVEN_NODE_IDS.has(node.id)}
                      onToggle={onToggle}
                      registerRef={registerRef}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        aria-live="polite"
        className="mt-8 flex flex-wrap items-center gap-4 text-[11px] uppercase tracking-wide text-muted"
      >
        {hasFilter && matchedCount > 0 && (
          <span>
            Resultado{" "}
            <span className="text-body">
              {String(matchedCount).padStart(2, "0")} / {String(PROJECTS.length).padStart(2, "0")}
            </span>{" "}
            proyectos
          </span>
        )}
        {hasFilter && matchedCount === 0 && (
          <span className="normal-case tracking-normal">
            {picked.size > 1
              ? "Ningún proyecto usa esa combinación completa — probá sacando alguna tecnología."
              : "Todavía ningún proyecto cargado usa esto — hay trabajo en camino."}
          </span>
        )}
        {hasFilter && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 font-semibold text-brand-skills transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <RotateCcw size={12} /> Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}
