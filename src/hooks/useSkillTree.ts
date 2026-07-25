import { useCallback, useMemo, useState } from "react";
import { ANCESTORS } from "../data/skillTree";

/**
 * Selección de nodos del árbol de skills. Distingue DOS conjuntos, y esa
 * distinción es la que hace que el filtro sea congruente:
 *
 * - `picked`: lo que el usuario clickeó explícitamente. Es lo ÚNICO que
 *   filtra proyectos.
 * - `selected`: `picked` + toda su cadena de prerequisitos (clausura sobre
 *   `requires`). Es puramente visual — enciende el camino en la red, que es
 *   la lectura pedagógica ("para React necesitás HTML5 y JavaScript").
 *
 * Por qué separados: antes filtraba `selected`, así que un clic en Tailwind
 * encendía css3+html5 y el filtro pasaba a ser "tailwind O css3 O html5" —
 * como casi todo proyecto tiene HTML/CSS, matcheaban todos y el filtro no
 * decía nada. Ahora los prerequisitos se iluminan pero no filtran.
 *
 * Toggle: un clic sobre un nodo lo agrega/saca de `picked`. Clickear un nodo
 * que está encendido sólo como prerequisito lo asciende a elegido (pasa a
 * filtrar); sacar un elegido apaga su cadena salvo lo que siga sosteniendo
 * otro elegido — la clausura se recalcula sola, no hay estado que sincronizar.
 */
export function useSkillTree() {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Clausura de `picked` sobre `requires`: lo que se ve encendido en la red.
  const selected = useMemo(() => {
    const out = new Set(picked);
    for (const id of picked) {
      for (const req of ANCESTORS.get(id) ?? []) out.add(req);
    }
    return out;
  }, [picked]);

  const clear = useCallback(() => setPicked(new Set()), []);

  return { picked, selected, toggle, clear };
}
