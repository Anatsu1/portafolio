import { useRef } from "react";
import { RotateCcw } from "lucide-react";
import { PROJECTS } from "../../../data/projects";
import {
  LAYOUT_CHILDREN,
  PROVEN_NODE_IDS,
  ROOTS,
  TIER_COUNT,
  type SkillNode,
} from "../../../data/skillTree";
import { useMeasuredEdges, type MeasuredEdge } from "../../../hooks/useMeasuredEdges";
import SkillNodeButton, { SLOT_H, SLOT_W } from "./SkillNodeButton";

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

// Separación entre una fase y la siguiente. Sumada al casillero del nodo
// (`SLOT_W`/`SLOT_H`) da el paso de la grilla: como las dos son constantes,
// cada rama arranca su fase N en la misma coordenada sin coordinarse con
// las demás. Vale para los dos sentidos —es el gap del eje principal— y lo
// comparte el rótulo de fase.
const LEVEL_GAP = "gap-1 wide:gap-7";

// Aire entre hermanos, más suelto arriba que abajo: así se ve de un vistazo
// dónde se bifurca una familia y dónde son hojas de la misma rama. En
// `wide` las hojas se separan un poco más que en angosto porque ahí quedan
// una al lado de la otra y los labels largos (POSTGRESQL) casi se tocan.
const SIBLING_GAP = ["gap-4", "gap-3", "gap-2 wide:gap-3"];

// Entre familias. Bastante más que entre hermanos: es lo que las hace leer
// como bloques separados.
const FAMILY_GAP = "gap-12 wide:gap-6";

type BranchProps = {
  node: SkillNode;
  depth: number;
  picked: Set<string>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
};

/**
 * Un nodo y, pegado a él, el bloque de lo que habilita (recursivo).
 * `items-center` centra al padre contra ese bloque entero, que es lo que
 * hace que las aristas salgan cortas y sin cruzarse.
 *
 * El sentido se da vuelta en `wide` y **el árbol no se entera**: angosto,
 * los hijos van a la derecha en columna; ancho, van abajo en fila. Es el
 * mismo DOM con los ejes cambiados, así que no hay dos layouts que
 * mantener ni nodos duplicados peleando por el ref de medición.
 */
function Branch({ node, depth, picked, selected, onToggle, registerRef }: BranchProps) {
  const children = LAYOUT_CHILDREN.get(node.id) ?? [];
  return (
    <div className={`flex flex-row items-center wide:flex-col ${LEVEL_GAP}`}>
      <SkillNodeButton
        node={node}
        picked={picked.has(node.id)}
        selected={selected.has(node.id)}
        locked={node.requires.some((req) => !selected.has(req))}
        proven={PROVEN_NODE_IDS.has(node.id)}
        onToggle={onToggle}
        registerRef={registerRef}
      />
      {children.length > 0 && (
        <div
          className={`flex flex-col wide:flex-row ${SIBLING_GAP[Math.min(depth, SIBLING_GAP.length - 1)]}`}
        >
          {children.map((child) => (
            <Branch
              key={child.id}
              node={child}
              depth={depth + 1}
              picked={picked}
              selected={selected}
              onToggle={onToggle}
              registerRef={registerRef}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Red de nodos de skills, estilo grafo: círculos con label debajo,
 * conectados por curvas SVG que unen los centros reales medidos del DOM
 * (ver useMeasuredEdges) — correctas en cualquier breakpoint por
 * construcción. Arista "energizada" (sólida, color de skills) cuando sus
 * dos extremos están seleccionados; punteada/apagada si no.
 *
 * **Siempre agrupado por familia; lo que cambia es el sentido.** Cada raíz
 * (web, python, javascript, bd, herramientas) abre su propio bloque:
 *
 *   - angosto (< `wide`): un bloque por FILA, que crece hacia la derecha.
 *     Las fases son columnas. Es el único que entra en un teléfono.
 *   - ancho (≥ `wide`): un bloque por COLUMNA, que crece hacia abajo. Las
 *     fases son filas, con su rótulo a la izquierda. Aprovecha el ancho
 *     que sobra y baja el mapa de ~1100px de alto a ~450.
 *
 * Es el mismo árbol con los ejes dados vuelta (ver `Branch`), no dos
 * layouts. El corte está en 1200px porque recién ahí entran las 12 hojas
 * una al lado de la otra sin que los labels se toquen.
 *
 * Antes el layout agrupaba por fase —una columna por fase en desktop, una
 * fila que envolvía en mobile— y los hijos de una familia caían lejos de su
 * padre: en desktop la línea de CSS3 a sus hojas pasaba por encima de
 * Next.js, y en mobile, con ~9 nodos por fase, quedaba una maraña de
 * diagonales que cruzaban la pantalla entera. Agrupar por familia lo
 * arregla de raíz.
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
      {/* En `wide` el mapa se come el padding lateral de la sección (-mx-6
          cancela el px-6 justo, y deja 16px cuando corre el px-10 de md):
          las 12 hojas a lo ancho no entran en la columna de texto. Nunca
          puede desbordar la página, porque sólo recupera padding propio. */}
      <div className="wide:-mx-6">
        {/* `w-fit` + `mx-auto`: el contenedor mide exactamente lo que ocupa el
            mapa y queda centrado. Importa para la medición de aristas — el SVG
            se dimensiona con esta caja. En `wide` el rótulo de fase pasa de
            estar arriba a estar a la izquierda, de ahí el cambio de eje. */}
        <div
          ref={containerRef}
          className="relative mx-auto flex w-fit flex-col wide:flex-row wide:items-start wide:gap-4"
        >
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

          {/* Rótulos de fase: una ranura por fase, con el casillero y el gap
              de los nodos, así caen justo sobre su columna (angosto) o al
              lado de su fila (ancho). La cantidad sale de TIER_COUNT (=
              profundidad del árbol), no de una lista a mano. El `pt` de
              `wide` lo baja hasta la altura del círculo, que va arriba del
              casillero, no en el centro. */}
          <div className={`relative flex flex-row wide:flex-col ${LEVEL_GAP}`}>
            {Array.from({ length: TIER_COUNT }, (_, t) => (
              <p
                key={t}
                className={`${SLOT_W} ${SLOT_H} text-center text-[10px] font-semibold uppercase tracking-widest text-muted wide:pt-4 wide:text-right`}
              >
                Fase {String(t).padStart(2, "0")}
              </p>
            ))}
          </div>

          {/* Una familia por fila (angosto) o por columna (ancho). Su
              separación es bien mayor que la que hay entre hermanos: es lo
              que las hace leer como bloques aparte. */}
          <div className={`relative mt-6 flex flex-col wide:mt-0 wide:flex-row ${FAMILY_GAP}`}>
            {ROOTS.map((root) => (
              <Branch
                key={root.id}
                node={root}
                depth={0}
                picked={picked}
                selected={selected}
                onToggle={onToggle}
                registerRef={registerRef}
              />
            ))}
          </div>
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
