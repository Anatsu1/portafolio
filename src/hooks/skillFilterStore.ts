/**
 * Estado compartido del filtro de tecnologías (`picked` del árbol de skills).
 * Vive fuera de React para que lo compartan la sección Proyectos (el árbol) y
 * el buscador del laboratorio: buscar "React" en el laboratorio filtra las
 * fichas igual que tocar el nodo en el árbol.
 */
let picked: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();

function emit(next: ReadonlySet<string>) {
  picked = next;
  listeners.forEach((l) => l());
}

export const skillFilterStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => picked,
  set: (ids: Iterable<string>) => emit(new Set(ids)),
  toggle(id: string) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    emit(next);
  },
  clear: () => emit(new Set()),
};
