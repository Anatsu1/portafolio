import { useCallback, useState } from "react";
import { ANCESTORS, DESCENDANTS, NODE_BY_ID } from "../data/skillTree";

/**
 * Selección de nodos del árbol de skills, con semántica de prerequisitos:
 *
 * - Seleccionar un nodo enciende también toda su cadena de prerequisitos
 *   (1 clic en "React" enciende HTML5 → JavaScript → React) — la
 *   pedagogía se ve en el gesto, sin obligar a clickear de a uno.
 * - Deseleccionar un nodo apaga también a todos sus dependientes (no puede
 *   quedar React encendido sin JavaScript).
 *
 * Invariante: `selected` siempre es cerrado bajo `requires` — ambas
 * operaciones lo mantienen por construcción.
 *
 * `isLocked` es un estado puramente visual (prerequisitos sin seleccionar):
 * el nodo sigue siendo clickeable, el candado solo cuenta la historia.
 */
export function useSkillTree() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (prev.has(id)) {
        next.delete(id);
        for (const dep of DESCENDANTS.get(id) ?? []) next.delete(dep);
      } else {
        next.add(id);
        for (const req of ANCESTORS.get(id) ?? []) next.add(req);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const isLocked = useCallback(
    (id: string) => {
      const node = NODE_BY_ID.get(id);
      if (!node) return false;
      return node.requires.some((req) => !selected.has(req));
    },
    [selected]
  );

  return { selected, toggle, clear, isSelected, isLocked };
}
