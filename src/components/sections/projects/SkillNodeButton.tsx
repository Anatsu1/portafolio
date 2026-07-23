import { Lock } from "lucide-react";
import type { SkillNode } from "../../../data/skillTree";

type SkillNodeButtonProps = {
  node: SkillNode;
  selected: boolean;
  /** Prerequisitos sin seleccionar. Estado visual: sigue siendo clickeable
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
 * Vocabulario visual heredado: borde sólido = probado por un proyecto,
 * punteado = todavía sin proyecto; candado = prerequisitos apagados.
 */
export default function SkillNodeButton({
  node,
  selected,
  locked,
  proven,
  onToggle,
  registerRef,
}: SkillNodeButtonProps) {
  const circle = selected
    ? "border-brand-skills bg-brand-skills/15"
    : proven
      ? "border-border/40 bg-surface group-hover:border-brand-skills/60"
      : "border-dashed border-border/30 bg-surface group-hover:border-brand-skills/60";

  const label = selected ? "text-heading" : proven ? "text-body" : "text-muted";

  return (
    <button
      type="button"
      onClick={() => onToggle(node.id)}
      aria-pressed={selected}
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
          <span
            className={`h-1.5 w-1.5 rounded-full transition ${
              selected ? "bg-brand-skills" : "bg-border/30"
            }`}
          />
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
