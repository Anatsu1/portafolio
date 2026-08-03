import { TOOLBOX } from "../../../data/skillTree";

/**
 * Herramientas informativas debajo de la red de skills: NO son nodos ni
 * filtran nada (ver `TOOLBOX` en `data/skillTree.ts`). Se renderizan como
 * texto/chips inertes a propósito — nada de `<button>` ni hover de acción,
 * para que no inviten a un clic que no hace nada.
 */
export default function Toolbox() {
  return (
    <div className="mt-10 border-t border-border/10 pt-6">
      <p className="text-[11px] uppercase tracking-wide text-muted">
        También trabajo con{" "}
        <span className="normal-case tracking-normal">(no filtran proyectos)</span>
      </p>
      <dl className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-4">
        {TOOLBOX.map((group) => (
          <div key={group.group} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {group.group}
            </dt>
            <dd className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-dashed border-border/25 px-3 py-1 text-xs text-body"
                >
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
