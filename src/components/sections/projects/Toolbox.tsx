import { useState } from "react";
import { TOOLBOX } from "../../../data/skillTree";

/**
 * Herramientas informativas debajo de la red de skills. NO son nodos del
 * árbol ni filtran proyectos (ver `TOOLBOX` en `data/skillTree.ts`): los
 * chips en sí siguen siendo inertes —nada de `<button>`— para que no
 * inviten a un clic que no hace nada. Cada uno lleva la marca monocroma de
 * la herramienta (paths en `data/brandIcons.ts`).
 *
 * Lo que SÍ se clickea es el rótulo de cada categoría: enciende y apaga
 * (toggle) las herramientas que la componen, que quedan iluminadas de
 * forma estable. Es un realce local, no toca el filtro de fichas — de ahí
 * que el estado viva acá y no en `useSkillTree`.
 *
 * En reposo los chips respiran una luz tenue (`animate-glow`) escalonada:
 * sin eso la fila quedaba tan apagada que se leía como pie de página. Al
 * encenderse se les saca la animación y se les pone una sombra fija: una
 * animación en curso le gana a cualquier declaración suelta, así que
 * convivir no es opción. El bloque global de `prefers-reduced-motion` en
 * index.css desactiva el pulso.
 */
export default function Toolbox() {
  const [litGroups, setLitGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: string) =>
    setLitGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  let chipIndex = -1;

  return (
    <div className="mt-10 border-t border-border/10 pt-6">
      <p className="text-[11px] uppercase tracking-wide text-muted">
        También trabajo con{" "}
        <span className="normal-case tracking-normal">
          (no filtran proyectos — tocá una categoría para resaltarla)
        </span>
      </p>
      <dl className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-4">
        {TOOLBOX.map((group) => {
          const lit = litGroups.has(group.group);
          return (
            <div key={group.group} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <dt>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.group)}
                  aria-pressed={lit}
                  className={`text-[10px] font-semibold uppercase tracking-widest transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                    lit ? "text-brand-skills" : "text-muted hover:text-body"
                  }`}
                >
                  {group.group}
                </button>
              </dt>
              <dd className="flex flex-wrap gap-2">
                {group.items.map((item) => {
                  chipIndex += 1;
                  return (
                    <span
                      key={item.label}
                      style={lit ? undefined : { animationDelay: `${chipIndex * 450}ms` }}
                      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors duration-300 ${
                        lit
                          ? "border-solid border-brand-skills bg-brand-skills/10 text-heading shadow-[0_0_16px_-2px_rgb(var(--color-brand-skills)/0.55)]"
                          : "animate-glow border-dashed border-brand-skills/30 text-body hover:border-brand-skills/70 hover:text-heading"
                      }`}
                    >
                      {/* La marca se pinta con `currentColor`: hereda el color
                          del chip y sale monocroma en los dos temas, sin tener
                          un asset por tema. `aria-hidden` porque el nombre ya
                          está al lado en texto. */}
                      <svg
                        aria-hidden
                        viewBox={item.viewBox}
                        fill="currentColor"
                        fillRule={item.fillRule}
                        className={`h-3.5 w-3.5 shrink-0 transition-opacity duration-300 group-hover:opacity-100 ${
                          lit ? "opacity-100" : "opacity-70"
                        }`}
                      >
                        <path d={item.path} />
                      </svg>
                      {item.label}
                    </span>
                  );
                })}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
