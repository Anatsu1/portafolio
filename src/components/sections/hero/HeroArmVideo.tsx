import { useMemo, useRef } from "react";
import type { SyntheticEvent } from "react";
import { useTheme } from "../../../hooks/useTheme";
import armLightMp4 from "../../../assets/arm-light.mp4";
import armLightPoster from "../../../assets/arm-light-poster.jpg";
import armDarkMp4 from "../../../assets/arm-dark.mp4";
import armDarkPoster from "../../../assets/arm-dark-poster.jpg";

const ARM = {
  light: { mp4: armLightMp4, poster: armLightPoster },
  dark: { mp4: armDarkMp4, poster: armDarkPoster },
};

// Segundo (del clip) en el que el brazo suelta el círculo en la celda. Al
// cruzarlo se dispara el reveal del texto. Afinar si cambia el render.
const DROP_TIME = 4.4;

type HeroArmVideoProps = {
  /** Se llama una vez, cuando el brazo suelta el círculo (o al terminar). */
  onDrop?: () => void;
  className?: string;
};

/**
 * Video del brazo robótico (render pre-producido, sin texto quemado), usado
 * como fondo del Hero. Elige la variante clara (azul) u oscura (verde) según
 * el tema. Corre una vez (el navegador retiene el último frame) y avisa el
 * momento del "drop" (`onDrop`) para sincronizar la aparición del nombre.
 * Con `prefers-reduced-motion` muestra solo el poster.
 */
export default function HeroArmVideo({ onDrop, className }: HeroArmVideoProps) {
  const { theme } = useTheme();
  const src = ARM[theme];
  const firedRef = useRef(false);

  const reduceMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const fire = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onDrop?.();
  };

  const handleTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => {
    if (e.currentTarget.currentTime >= DROP_TIME) fire();
  };

  const media = "h-full w-full object-cover object-center";

  if (reduceMotion) {
    return <img src={src.poster} alt="" aria-hidden className={`${media} ${className ?? ""}`} />;
  }

  return (
    <video
      // Remontar al cambiar de tema recarga el <source> correcto.
      key={theme}
      className={`${media} ${className ?? ""}`}
      autoPlay
      muted
      playsInline
      preload="auto"
      poster={src.poster}
      aria-hidden
      onTimeUpdate={handleTimeUpdate}
      onEnded={fire}
      onError={fire}
    >
      <source src={src.mp4} type="video/mp4" />
    </video>
  );
}
