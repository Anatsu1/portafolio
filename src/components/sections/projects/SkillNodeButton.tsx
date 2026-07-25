import { Lock } from "lucide-react";
import type { SkillNode } from "../../../data/skillTree";

type SkillNodeButtonProps = {
  node: SkillNode;
  /** Elegido a mano: además de encendido, está filtrando proyectos. */
  picked: boolean;
  /** Encendido en la red: elegido, o prerequisito de algo elegido. */
  selected: boolean;
  /** Prerequisitos sin encender. Estado visual: sigue siendo clickeable
   *  (el clic enciende toda la cadena, ver useSkillTree). */
  locked: boolean;
  /** Alguna ficha de proyecto usa esta tecnología. */
  proven: boolean;
  onToggle: (id: string) => void;
  /** Callback ref sobre el CÍRCULO (no el botón entero): las aristas SVG
   *  apuntan al centro medido del círculo, el label queda afuera. */
  registerRef: (id: string, el: HTMLElement | null) => void;
};

/**
 * Nodo del árbol de skills, estilo grafo/red: un círculo con el label
 * debajo (como en las visualizaciones de grafos), no un chip rectangular.
 * El círculo tiene `bg-surface` opaco a propósito: enmascara el extremo de
 * las aristas, que llegan a su centro sin lógica de anclaje por lado.
 *
 * Vocabulario visual: borde sólido = probado por un proyecto, punteado =
 * todavía sin proyecto; candado = prerequisitos apagados. Y tres niveles de
 * encendido, que es lo que hace legible el filtro:
 *   - ELEGIDO (halo + relleno fuerte): está filtrando proyectos.
 *   - PREREQUISITO (encendido tenue): se encendió solo porque algo elegido
 *     lo necesita; NO filtra.
 *   - apagado.
 * Sin esa diferencia, ver CSS3 encendido por elegir Tailwind hacía esperar
 * que CSS3 también filtrara.
 */
export default function SkillNodeButton({
  node,
  picked,
  selected,
  locked,
  proven,
  onToggle,
  registerRef,
}: SkillNodeButtonProps) {
  const circle = picked
    ? "border-brand-skills bg-brand-skills/20 ring-2 ring-brand-skills/25 ring-offset-2 ring-offset-background"
    : selected
      ? "border-brand-skills/45 bg-brand-skills/5"
      : proven
        ? "border-border/40 bg-surface group-hover:border-brand-skills/60"
        : "border-dashed border-border/30 bg-surface group-hover:border-brand-skills/60";

  const label = picked
    ? "font-semibold text-heading"
    : selected
      ? "text-body"
      : proven
        ? "text-body"
        : "text-muted";

  const dot = picked ? "bg-brand-skills" : selected ? "bg-brand-skills/50" : "bg-border/30";

  return (
    <button
      type="button"
      onClick={() => onToggle(node.id)}
      aria-pressed={picked}
      className={`group flex w-16 flex-col items-center gap-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary md:w-20 ${
        locked && !selected ? "opacity-60" : ""
      }`}
    >
      <span
        ref={(el) => registerRef(node.id, el)}
        aria-hidden
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition md:h-11 md:w-11 ${circle}`}
      >
        {locked && !selected ? (
          <Lock size={12} className="text-muted" />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full transition ${dot}`} />
        )}
      </span>
      <span
        className={`text-center text-[10px] font-medium uppercase leading-tight tracking-wide transition ${label}`}
      >
        {node.label}
      </span>
    </button>
  );
}
