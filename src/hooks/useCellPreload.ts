import { useEffect, useState } from "react";
import { CELL_PRELOAD_URLS } from "../data/cellModels";

type Preload = {
  /** 0..1: bytes descargados sobre el total (el chunk de la escena cuenta como un paso más). */
  progress: number;
  done: boolean;
};

/**
 * Precarga lo que necesita la celda 3D (el chunk lazy de la escena y los
 * `.glb`) y reporta el avance real en bytes. Baja los archivos con `fetch`
 * para dejarlos en la caché HTTP: cuando drei los pida, salen de ahí al
 * instante. Vive en el paquete principal, así que no importa `three`.
 *
 * Con `enabled = false` (teléfonos, sin WebGL, movimiento reducido) no hace
 * nada y reporta `done` de entrada. Si algo falla, también termina: el loader
 * nunca debe quedar colgado por esto.
 */
export function useCellPreload(enabled: boolean): Preload {
  const [state, setState] = useState<Preload>({ progress: enabled ? 0 : 1, done: !enabled });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const loaded = new Map<string, number>();
    const totals = new Map<string, number>();
    let chunkDone = false;

    const report = () => {
      let got = 0;
      let all = 0;
      for (const url of CELL_PRELOAD_URLS) {
        got += loaded.get(url) ?? 0;
        // Hasta saber el tamaño real se estima parejo, para que la barra no salte.
        all += totals.get(url) ?? 1_500_000;
      }
      const bytes = all > 0 ? Math.min(1, got / all) : 1;
      const progress = bytes * 0.95 + (chunkDone ? 0.05 : 0);
      if (!cancelled) setState({ progress, done: false });
    };

    const fetchOne = async (url: string) => {
      const res = await fetch(url, { cache: "force-cache" });
      const total = Number(res.headers.get("content-length")) || 0;
      if (total) totals.set(url, total);
      const reader = res.body?.getReader();
      if (!reader) {
        await res.arrayBuffer();
        loaded.set(url, total || 1);
        return;
      }
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.byteLength;
        loaded.set(url, got);
        report();
      }
      totals.set(url, got);
    };

    const chunk = import("../components/sections/celda/CellScene").then(() => {
      chunkDone = true;
      report();
    });

    Promise.allSettled([chunk, ...CELL_PRELOAD_URLS.map(fetchOne)]).then(() => {
      if (!cancelled) setState({ progress: 1, done: true });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
