import { useEffect, useState, type MutableRefObject, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsUp, Hand, HelpCircle, X } from "lucide-react";
import type { CellCommands, PilotKey } from "../../../hooks/useCellController";

type PilotHudProps = {
  commandsRef: MutableRefObject<CellCommands | null>;
  onExit: () => void;
};

/** Botón que mantiene apretada una dirección mientras se lo sostiene (mouse o dedo). */
function HoldKey({ k, commandsRef, label, children }: { k: PilotKey; commandsRef: PilotHudProps["commandsRef"]; label: string; children: ReactNode }) {
  const set = (down: boolean) => () => commandsRef.current?.pilotKey(k, down);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true)();
      }}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onLostPointerCapture={set(false)}
      className="flex h-7 w-7 touch-none select-none items-center justify-center rounded-md border border-border/30 bg-surface/80 text-heading shadow-sm backdrop-blur transition active:scale-95 active:bg-brand-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
    >
      {children}
    </button>
  );
}

const KEY = "rounded border border-border/30 bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-heading";

/**
 * Mando del modo piloto: cruceta (girar / extender), subir-bajar y garra, con
 * la leyenda de las teclas. Los botones sirven con mouse; el teclado funciona
 * en todo momento mientras el modo está activo (ver useCellController).
 */
const LEGEND_MS = 7000; // la leyenda se muestra un rato al entrar y después se esconde

export default function PilotHud({ commandsRef, onExit }: PilotHudProps) {
  const [legend, setLegend] = useState(true);
  useEffect(() => {
    if (!legend) return;
    const id = window.setTimeout(() => setLegend(false), LEGEND_MS);
    return () => window.clearTimeout(id);
  }, [legend]);
  return (
    <div
      className={`absolute left-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-end gap-2 rounded-xl border border-border/30 bg-background/80 p-2 shadow-xl backdrop-blur`}
    >
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Girar y extender el brazo">
        <span />
        <HoldKey k="forward" commandsRef={commandsRef} label="Extender (W / ↑)">
          <ArrowUp size={14} />
        </HoldKey>
        <span />
        <HoldKey k="left" commandsRef={commandsRef} label="Girar a la izquierda (A / ←)">
          <ArrowLeft size={14} />
        </HoldKey>
        <HoldKey k="back" commandsRef={commandsRef} label="Retraer (S / ↓)">
          <ArrowDown size={14} />
        </HoldKey>
        <HoldKey k="right" commandsRef={commandsRef} label="Girar a la derecha (D / →)">
          <ArrowRight size={14} />
        </HoldKey>
      </div>
      <div className="flex flex-col gap-1" role="group" aria-label="Altura de la garra">
        <HoldKey k="up" commandsRef={commandsRef} label="Subir (Q)">
          <ChevronsUp size={14} />
        </HoldKey>
        <HoldKey k="down" commandsRef={commandsRef} label="Bajar (E)">
          <ChevronsDown size={14} />
        </HoldKey>
      </div>
      <button
        type="button"
        onClick={() => commandsRef.current?.pilotGrab()}
        className="inline-flex h-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-md bg-brand-primary px-2.5 text-[10px] font-bold uppercase tracking-wider text-on-brand transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Hand size={16} />
        Agarrar / soltar
      </button>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={onExit} aria-label="Salir del modo piloto (Esc)" title="Salir (Esc)" className="flex h-7 w-7 items-center justify-center rounded-md border border-border/30 bg-surface/80 text-heading transition hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
          <X size={14} />
        </button>
        <button type="button" onClick={() => setLegend((v) => !v)} aria-label="Ver las teclas" aria-expanded={legend} title="Ver las teclas" className="flex h-7 w-7 items-center justify-center rounded-md border border-border/30 bg-surface/80 text-heading transition hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
          <HelpCircle size={14} />
        </button>
      </div>
      {legend && (
        <div className="max-w-[13rem] text-[11px] leading-relaxed text-muted">
          <p className="font-semibold text-heading">Llevá una caja al círculo ENTREGA</p>
          <p className="mt-1">
            <span className={KEY}>← →</span> girar · <span className={KEY}>↑ ↓</span> extender
          </p>
          <p className="mt-1">
            <span className={KEY}>Q</span> subir · <span className={KEY}>E</span> bajar · <span className={KEY}>Espacio</span> garra
          </p>
          <p className="mt-1 font-semibold text-brand-primary">Esc: salir</p>
        </div>
      )}
    </div>
  );
}
