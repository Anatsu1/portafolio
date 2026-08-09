import { useEffect, useState } from "react";

/**
 * ¿El dispositivo tiene un puntero capaz de hacer hover (mouse/trackpad)?
 *
 * Se usa para decidir cómo se enciende el auto-avance del carrusel de las
 * fichas: con mouse alcanza el hover, pero en un teléfono el hover no existe
 * y ahí manda la ficha que el scroll-snap dejó calzada. Es `matchMedia` y no
 * un breakpoint de Tailwind porque la decisión no es de ancho de pantalla: un
 * tablet con teclado tiene mouse y una notebook táctil angosta también.
 *
 * Arranca en `false` para que el primer render sea el conservador (nada
 * rotando) y se corrige en el efecto.
 */
export function useHasHover() {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover)");
    setHasHover(query.matches);
    const onChange = (event: MediaQueryListEvent) => setHasHover(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return hasHover;
}
