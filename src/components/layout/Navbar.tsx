import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { NAV_LINKS } from "../../data";
import { useScrollPosition } from "../../hooks/useScrollPosition";
import { useTheme } from "../../hooks/useTheme";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrollPosition();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition ${
        scrolled
          ? "border-b border-border/5 bg-background/85 backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <a href="#inicio" className="font-display text-lg font-bold text-heading">
          hola
          <span className="text-brand-primary">.mundo</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className="text-sm font-medium text-body transition hover:text-brand-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            onClick={toggleTheme}
            className="rounded-lg border border-border/15 bg-surface/70 p-2 text-brand-primary shadow-sm transition hover:border-brand-primary/60 hover:bg-brand-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-body transition hover:bg-border/5 md:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="space-y-1 border-t border-border/5 bg-background px-6 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-body transition hover:bg-border/5 hover:text-brand-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
