import { AnimatePresence, motion } from "motion/react";
import { Cog } from "lucide-react";

/**
 * Cartel de carga que cubre el fondo del Hero mientras se rehace la animación
 * del brazo al cambiar de tema. Sin él, el video recarga con un instante de
 * poster quieto y parece un error.
 */
export default function HeroThemeLoader({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="hero-theme-loading"
          role="status"
          className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Cog className="animate-[spin_3s_linear_infinite] text-heading" size={40} strokeWidth={1.5} />
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted">
            Cargando el tema<span className="animate-pulse">…</span>
          </p>
          <div className="h-0.5 w-44 overflow-hidden rounded-full bg-border/15">
            <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] rounded-full bg-heading/70" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
