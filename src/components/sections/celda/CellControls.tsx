import { CELL_BOXES } from "../../../data/cell";
import type { CellMode } from "../../../hooks/useCellController";

type CellControlsProps = {
  mode: CellMode;
  onModeChange: (mode: CellMode) => void;
  showing: number | null;
  onShow: (index: number) => void;
};

const MODES: { id: CellMode; label: string }[] = [
  { id: "auto", label: "Automático" },
  { id: "manual", label: "Manual" },
];

/**
 * Controles de la celda: selector de modo y una fila de botones, uno por
 * caja. Los botones son la alternativa accesible (teclado, lector de
 * pantalla) al clic directo sobre las cajas, y sirven igual con el modo
 * automático encendido: elegir una pasa a manual.
 */
export default function CellControls({ mode, onModeChange, showing, onShow }: CellControlsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div
        role="group"
        aria-label="Modo del brazo"
        className="inline-flex rounded-lg border border-border/10 bg-surface/70 p-1 text-sm"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => onModeChange(m.id)}
            className={`rounded-md px-3 py-1.5 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              mode === m.id
                ? "bg-brand-primary text-on-brand"
                : "text-muted hover:text-heading"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Elegir caja">
        {CELL_BOXES.map((box, i) => (
          <button
            key={box.id}
            type="button"
            onClick={() => onShow(i)}
            aria-pressed={showing === i}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${
              showing === i
                ? "border-brand-primary bg-brand-primary/15 text-brand-primary"
                : "border-border/10 bg-surface/50 text-body hover:border-brand-primary/50 hover:text-brand-primary"
            }`}
          >
            {box.label}
          </button>
        ))}
      </div>
    </div>
  );
}
