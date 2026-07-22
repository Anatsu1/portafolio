import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "portfolio:theme";
type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  // Sin elección guardada: respeta el modo claro/oscuro que el visitante
  // ya tiene configurado en su SO/navegador.
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Provee el tema a toda la app. Es la única fuente de verdad del modo
 * claro/oscuro: togglea la clase `.dark` en <html> y persiste la elección
 * en localStorage. Vive en un contexto (no en estado local) para que
 * cualquier componente —Navbar, Hero, etc.— comparta el mismo estado y
 * reaccione al toggle.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
