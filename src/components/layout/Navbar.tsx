import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, OWNER } from "../../data";
import { useScrollPosition } from "../../hooks/useScrollPosition";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrollPosition();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition ${
        scrolled
          ? "border-b border-white/5 bg-ink-950/85 backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <a href="#inicio" className="font-display text-lg font-bold text-white">
          {OWNER.shortName.split(" ")[0]}
          <span className="text-accent-400">.dev</span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className="text-sm font-medium text-slate-300 transition hover:text-accent-400"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-200 transition hover:bg-white/5 md:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <ul className="space-y-1 border-t border-white/5 bg-ink-900 px-6 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-slate-200 transition hover:bg-white/5 hover:text-accent-400"
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
