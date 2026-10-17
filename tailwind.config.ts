import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        // "md" = desktop de verdad: ancho de tablet Y altura razonable.
        // Un teléfono girado (~900×410) supera los 768px de ancho pero no
        // tiene alto para el layout desktop (el Hero se posiciona con vh y
        // el nav horizontal se pisa con el texto) — con esta condición
        // conserva el layout mobile, que fluye y scrollea. Ojo: al ser un
        // screen "raw" no se auto-ordena con los demás; no usar md: y lg:
        // sobre la MISMA propiedad de un mismo elemento (hoy no pasa en
        // ningún componente — verificado por grep).
        md: { raw: "(min-width: 768px) and (min-height: 500px)" },
      },
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        heading: "rgb(var(--color-heading) / <alpha-value>)",
        body: "rgb(var(--color-body) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        "on-brand": "rgb(var(--color-on-brand) / <alpha-value>)",
        brand: {
          primary: "rgb(var(--color-brand-primary) / <alpha-value>)",
          projects: "rgb(var(--color-brand-projects) / <alpha-value>)",
          skills: "rgb(var(--color-brand-skills) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        // Respiración de luz de los chips de TOOLBOX. Solo box-shadow: el
        // borde y el color se dejan a clases, para que el hover pueda
        // pisarlos (una animación en curso le gana a una declaración suelta).
        glow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--color-brand-skills) / 0)" },
          "50%": { boxShadow: "0 0 14px -2px rgb(var(--color-brand-skills) / 0.4)" },
        },
        // Banda de texto en bucle (MarqueeBand): recorre la mitad, porque el contenido va duplicado.
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // Barra de carga indeterminada (cartel de cambio de entorno).
        loadbar: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
        // Cuenta regresiva del panel de la celda (se frena con animation-play-state).
        countdown: {
          "0%": { transform: "scaleX(1)" },
          "100%": { transform: "scaleX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .7s ease-out both",
        float: "float 6s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
        marquee: "marquee 38s linear infinite",
      },
    },
  },
  plugins: [
    // Variante `wide`: el mapa de skills se da vuelta (familias en columnas y fases en
    // filas, ver SkillTree.tsx). A partir de 1360px entran a lo ancho las 14 hojas del
    // árbol (1280px; si se suma otra hoja, ~80px, hay que subir el corte). También se
    // activa bajo un ancestro `.force-wide`: en pantallas angostas el mismo layout ancho
    // se muestra dentro de un visor con zoom y arrastre. No se combina con otro
    // breakpoint sobre la misma propiedad del mismo elemento.
    plugin(({ addVariant }) => {
      addVariant("wide", ["@media (min-width: 1360px)", ":is(.force-wide) &"]);
    }),
  ],
} satisfies Config;
