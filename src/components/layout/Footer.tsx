import { Github, Linkedin, Mail } from "lucide-react";
import { NAV_LINKS, OWNER } from "../../data";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-900">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between md:px-10">
        <p className="font-display font-semibold text-white">
          {OWNER.shortName}
        </p>

        <ul className="flex flex-wrap justify-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className="text-slate-400 transition hover:text-accent-300"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a href={OWNER.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="text-slate-400 transition hover:text-accent-300"><Github size={19} /></a>
          <a href={OWNER.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-slate-400 transition hover:text-accent-300"><Linkedin size={19} /></a>
          <a href={`mailto:${OWNER.email}`} aria-label="Correo" className="text-slate-400 transition hover:text-accent-300"><Mail size={19} /></a>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} {OWNER.name}. Hecho con React, TypeScript y Tailwind CSS.
      </p>
    </footer>
  );
}
