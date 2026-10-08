import { useEffect, useRef, useState } from "react";

/**
 * Observa si un elemento está en pantalla. `everSeen` queda en true desde la
 * primera vez (sirve para cargar de forma lazy) y `visible` sigue al viewport
 * (sirve para pausar el render del 3D cuando no se ve).
 */
export function useInViewport<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [everSeen, setEverSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setEverSeen(true);
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, visible, everSeen };
}
