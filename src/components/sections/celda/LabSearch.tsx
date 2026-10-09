import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { searchLab, type SearchHit } from "../../../data/skillSearch";
import CellIcon from "./CellIcon";
import type { CellIconId } from "../../../data/cellIcons";

type LabSearchProps = {
  /** Trae al plato la caja de esa sección. */
  onShowBox: (index: number) => void;
  /** Una tecnología: el brazo trae la caja PROYECTOS y su panel muestra solo lo que la usa. */
  onShowTech: (nodeId: string) => void;
};

/**
 * Buscador del laboratorio (nivel 1: por palabra). Escribís una tecnología
 * ("react", "docker", "postgres") o una sección ("educación") y el BRAZO hace
 * el trabajo: trae la caja de esa sección, o la caja PROYECTOS con el panel
 * limitado a lo que usa esa tecnología. No salta a la página ni la filtra: el
 * resultado se muestra en el laboratorio. Todo sale de los datos reales.
 */
export default function LabSearch({ onShowBox, onShowTech }: LabSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const hits = useMemo(() => searchLab(query), [query]);

  const choose = (hit: SearchHit) => {
    setQuery("");
    setActive(0);
    if (hit.kind === "box") onShowBox(hit.index);
    else onShowTech(hit.id);
  };

  return (
    <div className="relative mt-3 px-1">
      <div className="relative max-w-md">
        <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          role="combobox"
          aria-expanded={hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Buscar una tecnología o una sección"
          placeholder="Buscar: react, docker, educación…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && hits.length) {
              e.preventDefault();
              setActive((a) => (a + 1) % hits.length);
            } else if (e.key === "ArrowUp" && hits.length) {
              e.preventDefault();
              setActive((a) => (a - 1 + hits.length) % hits.length);
            } else if (e.key === "Enter" && hits[active]) {
              e.preventDefault();
              choose(hits[active]);
            } else if (e.key === "Escape") {
              setQuery("");
            }
          }}
          className="w-full rounded-lg border border-border/15 bg-background/60 py-2 pl-9 pr-3 text-sm text-body placeholder:text-muted transition focus:border-brand-primary/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        {hits.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute bottom-full z-30 mb-1 w-full overflow-hidden rounded-lg border border-border/20 bg-background/95 shadow-xl backdrop-blur"
          >
            {hits.map((hit, i) => (
              <li
                key={`${hit.kind}-${"id" in hit ? hit.id : ""}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(hit);
                }}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${
                  i === active ? "bg-brand-primary/10 text-heading" : "text-body"
                }`}
              >
                {hit.kind === "box" ? (
                  <CellIcon id={hit.id as CellIconId} size={15} className="text-brand-primary" />
                ) : (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                )}
                <span className="font-semibold">{hit.label}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wider text-muted">
                  {hit.kind === "box" ? "Sección" : "Tecnología"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
