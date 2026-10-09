
/**
 * Banda de texto en bucle entre secciones, con franjas de seguridad arriba y
 * abajo (el mismo amarillo/negro de las cajas y el vault). Es decorativa:
 * `aria-hidden`. El contenido se repite dos veces para que el bucle no tenga
 * corte (la animación recorre -50 %). Con movimiento reducido queda quieta
 * (regla global de index.css) y se frena al pasar el mouse.
 */
export default function MarqueeBand({ words }: { words: readonly string[] }) {
  const track = (
    <ul className="flex shrink-0 items-center gap-6 pr-6">
      {words.map((word, i) => (
        <li key={i} className="flex items-center gap-6 whitespace-nowrap">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-heading/60 md:text-sm">
            {word}
          </span>
          <span className="h-1 w-1 rotate-45 bg-brand-primary/70" />
        </li>
      ))}
    </ul>
  );

  return (
    <div aria-hidden className="group relative overflow-hidden border-y border-border/10 bg-surface/40 py-2">
      <div className="hazard-stripe absolute inset-x-0 top-0 h-0.5" />
      <div className="hazard-stripe absolute inset-x-0 bottom-0 h-0.5" />
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {track}
        {track}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
