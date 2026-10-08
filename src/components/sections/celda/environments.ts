/** Entornos elegibles de la celda. El render de cada uno vive en CellEnvironment. */
export type EnvId = "planta" | "pradera" | "linea";

export const ENVIRONMENTS: readonly { id: EnvId; label: string }[] = [
  { id: "planta", label: "Planta" },
  { id: "pradera", label: "Pradera" },
  { id: "linea", label: "Línea de montaje" },
] as const;
