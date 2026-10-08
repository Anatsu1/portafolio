/** Entornos elegibles de la celda. El render de cada uno vive en CellEnvironment. */
export type EnvId = "linea" | "bosque";

export const DEFAULT_ENV: EnvId = "linea";

export const ENVIRONMENTS: readonly { id: EnvId; label: string }[] = [
  { id: "linea", label: "Línea de montaje" },
  { id: "bosque", label: "Bosque" },
] as const;
