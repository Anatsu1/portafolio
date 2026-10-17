/**
 * Cajas de tecnología del estante trasero del laboratorio (Etapa 2). Cada una
 * apunta a un nodo del mapa de skills (`skillTree.ts`): al traerla, el panel
 * muestra todos los proyectos que usan esa tecnología. `short` es lo que se
 * estampa en la chapa (corto, para leerse a distancia).
 */
export type CellTech = { id: string; label: string; short: string };

export const CELL_TECH: readonly CellTech[] = [
  { id: "react", label: "React", short: "REACT" },
  { id: "typescript", label: "TypeScript", short: "TS" },
  { id: "nodejs", label: "Node.js", short: "NODE" },
  { id: "java", label: "Java", short: "JAVA" },
  { id: "python", label: "Python", short: "PY" },
  { id: "postgresql", label: "PostgreSQL", short: "PG" },
  { id: "docker", label: "Docker", short: "DOCKER" },
  { id: "tailwind", label: "Tailwind CSS", short: "TW" },
] as const;
