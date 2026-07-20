import { Github, Linkedin, Mail } from "lucide-react";
import { NAV_LINKS, OWNER } from "../../data";

export default function Footer() {
  return (
    <footer className="border-t border-border/5 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between md:px-10">
        <p className="font-display font-semibold text-heading">
          Portafolio de: Tec. {OWNER.name}
        </p>

        <ul className="flex flex-wrap justify-center gap-6 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className="text-muted transition hover:text-brand-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <a href={OWNER.github} target="_blank" rel="noreferrer" aria-label="GitHub" className="text-muted transition hover:text-brand-primary"><Github size={19} /></a>
          <a href={OWNER.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="text-muted transition hover:text-brand-primary"><Linkedin size={19} /></a>
          <a href={`mailto:${OWNER.email}`} aria-label="Correo" className="text-muted transition hover:text-brand-primary"><Mail size={19} /></a>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-muted/70">
        © {new Date().getFullYear()} {OWNER.name}. Hecho con React, TypeScript y Tailwind CSS.
      </p>
    </footer>
  );
}
