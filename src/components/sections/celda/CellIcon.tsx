import { CELL_ICON_PATHS, type CellIconId } from "../../../data/cellIcons";

type CellIconProps = {
  id: CellIconId;
  size?: number;
  /** Color del trazo; por defecto el del texto que lo rodea. */
  color?: string;
  className?: string;
};

/** Icono de sección o de modo, dibujado desde la definición compartida (`data/cellIcons.ts`). */
export default function CellIcon({ id, size = 16, color, className }: CellIconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {CELL_ICON_PATHS[id].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
