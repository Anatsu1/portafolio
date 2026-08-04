import type { Config } from "tailwindcss";

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
      },
      animation: {
        "fade-up": "fade-up .7s ease-out both",
        float: "float 6s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
