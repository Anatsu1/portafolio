/**
 * Renglón de texto en bucle (para el borde de una placa o una cinta). El texto
 * se repite y el bloque va duplicado: la animación recorre -50 % sin corte.
 */
export default function MarqueeStrip({
  phrase,
  className = "text-brand-primary/80",
  seconds = 55,
}: {
  phrase: string;
  className?: string;
  seconds?: number;
}) {
  const line = Array.from({ length: 8 }, () => `${phrase} ·`).join(" ");
  return (
    <div aria-hidden className="overflow-hidden py-2">
      <div className="flex w-max animate-marquee" style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((n) => (
          <span
            key={n}
            className={`whitespace-nowrap pr-6 font-display text-xs font-semibold uppercase tracking-[0.3em] ${className}`}
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
