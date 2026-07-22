import { useEffect, useMemo, useRef } from "react";
import type { SyntheticEvent } from "react";
import { useTheme } from "../../../hooks/useTheme";
import { useArmFollowCam } from "../../../hooks/useArmFollowCam";
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
  /**
   * Se llama una vez, cuando hay buffer suficiente para reproducir sin
   * trabarse (o de inmediato, si se muestra el poster estático). Recién ahí
   * arranca la reproducción — evita el video a tirones en la primera carga
   * sin caché.
   */
  onReady?: () => void;
  className?: string;
};

/**
 * Video del brazo robótico (render pre-producido, sin texto quemado), usado
 * como fondo del Hero. Elige la variante clara (azul) u oscura (verde) según
 * el tema. No usa `autoPlay`: espera a `canplaythrough` (buffer suficiente)
 * y recién ahí llama `.play()` — mientras tanto se ve el `poster`, nunca un
 * video a tirones. Corre una vez (el navegador retiene el último frame) y
 * avisa el momento del "drop" (`onDrop`) para sincronizar la aparición del
 * nombre. Con `prefers-reduced-motion` muestra solo el poster.
 *
 * En mobile, además, una "cámara" (`useArmFollowCam`) hace zoom y sigue la
 * pinza en vez de mostrar el recorte estático de `object-cover` — si no,
 * el gesto del brazo no se entiende en pantallas angostas.
 */
export default function HeroArmVideo({ onDrop, onReady, className }: HeroArmVideoProps) {
  const { theme } = useTheme();
  const src = ARM[theme];
  const videoRef = useRef<HTMLVideoElement>(null);
  const firedDropRef = useRef(false);
  const firedReadyRef = useRef(false);

  const reduceMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const isMobile = useMemo(
    () => window.matchMedia("(max-width: 767px)").matches,
    []
  );

  const { start: startFollowCam } = useArmFollowCam({
    videoRef,
    enabled: isMobile,
    resetKey: theme,
  });

  // El video se remonta (key={theme}) y repite la animación en cada cambio
  // de tema — "desarma" el drop para que el aura (useHeroReveal) pueda
  // reactivarse en cada ciclo, no solo la primera vez.
  useEffect(() => {
    firedDropRef.current = false;
  }, [theme]);

  const fireDrop = () => {
    if (firedDropRef.current) return;
    firedDropRef.current = true;
    onDrop?.();
  };

  const fireReady = () => {
    if (firedReadyRef.current) return;
    firedReadyRef.current = true;
    onReady?.();
  };

  const handleTimeUpdate = (e: SyntheticEvent<HTMLVideoElement>) => {
    if (e.currentTarget.currentTime >= DROP_TIME) fireDrop();
  };

  const handleCanPlayThrough = (e: SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.play().catch(() => {});
    startFollowCam();
    fireReady();
  };

  const handleError = () => {
    fireReady();
    fireDrop();
  };

  const media = "h-full w-full object-cover object-center";

  if (reduceMotion) {
    return (
      <img
        src={src.poster}
        alt=""
        aria-hidden
        className={`${media} ${className ?? ""}`}
        onLoad={fireReady}
        onError={fireReady}
      />
    );
  }

  return (
    <video
      // Remontar al cambiar de tema recarga el <source> correcto.
      key={theme}
      ref={videoRef}
      className={`${media} ${className ?? ""}`}
      muted
      playsInline
      preload="auto"
      poster={src.poster}
      aria-hidden
      onCanPlayThrough={handleCanPlayThrough}
      onTimeUpdate={handleTimeUpdate}
      onEnded={fireDrop}
      onError={handleError}
    >
      <source src={src.mp4} type="video/mp4" />
    </video>
  );
}
