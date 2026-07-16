import { ArrowDown, Download, Github, Linkedin, Mail } from "lucide-react";
import { OWNER } from "../data";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      {/* Fondo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-accent-500/20 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] left-[-10%] h-[380px] w-[380px] rounded-full bg-accent-600/10 blur-[120px]"
      />

      <div className="section-shell grid items-center gap-12 md:grid-cols-[1.2fr_1fr]">
        <div className="animate-fade-up">
          <p className="eyebrow">Hola, soy</p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            {OWNER.name.split(" ").slice(0, 2).join(" ")}
            <br />
            <span className="bg-gradient-to-r from-accent-400 to-accent-300 bg-clip-text text-transparent">
              {OWNER.name.split(" ").slice(2).join(" ")}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-400">
            {OWNER.role}. Construyo productos web rápidos, accesibles y
            mantenibles con TypeScript, React y Node.js.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white transition hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
            >
              <Mail size={18} /> Contáctame
            </a>
            <a
              href={OWNER.cvUrl}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-semibold text-slate-200 transition hover:border-accent-500/60 hover:text-accent-300"
            >
              <Download size={18} /> Descargar CV
            </a>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <a
              href={OWNER.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="rounded-lg border border-white/10 p-2.5 text-slate-300 transition hover:border-accent-500/60 hover:text-accent-300"
            >
              <Github size={20} />
            </a>
            <a
              href={OWNER.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="rounded-lg border border-white/10 p-2.5 text-slate-300 transition hover:border-accent-500/60 hover:text-accent-300"
            >
              <Linkedin size={20} />
            </a>
          </div>
        </div>

        {/* Monograma flotante */}
        <div className="hidden justify-center md:flex">
          <div className="animate-float flex h-72 w-72 items-center justify-center rounded-[2.5rem] border border-accent-500/30 bg-gradient-to-br from-ink-800 to-ink-900 shadow-2xl shadow-accent-500/10">
            <span className="font-display text-7xl font-extrabold text-accent-400">
              CF
            </span>
          </div>
        </div>
      </div>

      <a
        href="#sobre-mi"
        aria-label="Ir a la sección Sobre mí"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 transition hover:text-accent-400"
      >
        <ArrowDown className="animate-bounce" size={22} />
      </a>
    </section>
  );
}
