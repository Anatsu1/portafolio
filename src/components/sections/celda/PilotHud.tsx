import type { MutableRefObject, ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsUp, Hand } from "lucide-react";
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
      className="flex h-9 w-9 touch-none select-none items-center justify-center rounded-md border border-border/30 bg-surface/80 text-heading shadow-sm backdrop-blur transition active:scale-95 active:bg-brand-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
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
export default function PilotHud({ commandsRef, onExit }: PilotHudProps) {
  return (
    <div
      className={`absolute left-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-end gap-3 rounded-xl border border-border/30 bg-background/80 p-3 shadow-xl backdrop-blur`}
    >
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Girar y extender el brazo">
        <span />
        <HoldKey k="forward" commandsRef={commandsRef} label="Extender (W / ↑)">
          <ArrowUp size={16} />
        </HoldKey>
        <span />
        <HoldKey k="left" commandsRef={commandsRef} label="Girar a la izquierda (A / ←)">
          <ArrowLeft size={16} />
        </HoldKey>
        <HoldKey k="back" commandsRef={commandsRef} label="Retraer (S / ↓)">
          <ArrowDown size={16} />
        </HoldKey>
        <HoldKey k="right" commandsRef={commandsRef} label="Girar a la derecha (D / →)">
          <ArrowRight size={16} />
        </HoldKey>
      </div>
      <div className="flex flex-col gap-1" role="group" aria-label="Altura de la garra">
        <HoldKey k="up" commandsRef={commandsRef} label="Subir (Q)">
          <ChevronsUp size={16} />
        </HoldKey>
        <HoldKey k="down" commandsRef={commandsRef} label="Bajar (E)">
          <ChevronsDown size={16} />
        </HoldKey>
      </div>
      <button
        type="button"
        onClick={() => commandsRef.current?.pilotGrab()}
        className="inline-flex h-[4.75rem] flex-col items-center justify-center gap-1 rounded-md bg-brand-primary px-3 text-xs font-bold uppercase tracking-wider text-on-brand transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Hand size={18} />
        Agarrar / soltar
      </button>
      <div className="max-w-[13rem] text-[11px] leading-relaxed text-muted">
        <p className="font-semibold text-heading">Llevá una caja al círculo ENTREGA</p>
        <p className="mt-1">
          <span className={KEY}>← →</span> girar · <span className={KEY}>↑ ↓</span> extender
        </p>
        <p className="mt-1">
          <span className={KEY}>Q</span> subir · <span className={KEY}>E</span> bajar · <span className={KEY}>Espacio</span> garra
        </p>
        <button type="button" onClick={onExit} className="mt-1.5 font-semibold text-brand-primary underline-offset-2 hover:underline">
          Salir (Esc)
        </button>
      </div>
    </div>
  );
}
