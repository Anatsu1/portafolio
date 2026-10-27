import { useCallback, useMemo, useState } from "react";

/** Resolución máxima (devicePixelRatio) de la celda 3D en equipos holgados. */
const DPR_MAX = 1.75;
/** Tope en equipos modestos (pocos núcleos / poca memoria / ahorro de datos). */
const DPR_MAX_WEAK = 1.25;
const DPR_MIN = 1;
/** Paso de ajuste: cambiar el dpr redimensiona el canvas, así que se evitan los micro-saltos. */
const DPR_STEP = 0.25;

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** ¿Equipo modesto? Heurística barata; el ajuste fino lo hace `PerformanceMonitor` midiendo los FPS reales. */
function isWeakDevice() {
  if (typeof navigator === "undefined") return false;
  const n = navigator as NavigatorHints;
  return (
    (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 4) ||
    (n.deviceMemory !== undefined && n.deviceMemory <= 4) ||
    n.connection?.saveData === true
  );
}

/**
 * Calidad adaptativa del render 3D: devuelve el `dpr` actual y un `onChange`
 * para el `PerformanceMonitor` de drei. Arranca en el tope que le toca al
 * equipo y, si los FPS caen, baja la resolución de a pasos hasta `DPR_MIN`
 * (sube de nuevo si el equipo se recupera). Sin perder geometría ni efectos:
 * solo la cantidad de píxeles, que es lo que más pesa en GPUs integradas.
 */
export function useCellQuality() {
  const max = useMemo(() => (isWeakDevice() ? DPR_MAX_WEAK : DPR_MAX), []);
  const [dpr, setDpr] = useState(max);

  // `factor` va de 0 (muy lento) a 1 (fluido), con 0.5 de arranque.
  const onChange = useCallback(
    ({ factor }: { factor: number }) => {
      const next = DPR_MIN + (max - DPR_MIN) * factor;
      setDpr(Math.round(next / DPR_STEP) * DPR_STEP);
    },
    [max]
  );

  // Tras varios vaivenes el monitor se rinde: se queda en la resolución mínima.
  const onFallback = useCallback(() => setDpr(DPR_MIN), []);

  return { dpr, onChange, onFallback };
}
