import type { EnvId } from "./environments";
import AssemblyLine from "./AssemblyLine";
import Forest from "./Forest";

type Theme = "light" | "dark";
type CellEnvironmentProps = { env: EnvId; theme: Theme; rim: string };

/** Elige el entorno de la celda. Cada uno dibuja su fondo, luces y la plataforma del brazo. */
export default function CellEnvironment({ env, theme, rim }: CellEnvironmentProps) {
  if (env === "bosque") return <Forest theme={theme} rim={rim} />;
  return <AssemblyLine theme={theme} rim={rim} />;
}
