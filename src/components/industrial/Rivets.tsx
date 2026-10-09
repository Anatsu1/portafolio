/**
 * Cuatro remaches en las esquinas de una placa. El padre tiene que ser
 * `relative` (y suele llevar `overflow-hidden` o un borde redondeado).
 */
export default function Rivets() {
  const dot =
    "absolute h-2 w-2 rounded-full bg-gradient-to-br from-muted/70 to-border/40 shadow-[inset_0_1px_1px_rgb(var(--color-heading)/0.45)]";
  return (
    <>
      <span aria-hidden className={`${dot} left-2.5 top-2.5`} />
      <span aria-hidden className={`${dot} right-2.5 top-2.5`} />
      <span aria-hidden className={`${dot} bottom-2.5 left-2.5`} />
      <span aria-hidden className={`${dot} bottom-2.5 right-2.5`} />
    </>
  );
}
