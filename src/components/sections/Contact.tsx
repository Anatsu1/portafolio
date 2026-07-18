import { Mail, MapPin, Send } from "lucide-react";
import { OWNER } from "../../data";
import { useContactForm } from "../../hooks/useContactForm";

export default function Contact() {
  const { form, setForm, handleSubmit } = useContactForm(OWNER.email);

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-slate-200 " +
    "placeholder:text-slate-500 transition focus:border-accent-500/60 focus:outline-none " +
    "focus:ring-2 focus:ring-accent-500/30";

  return (
    <section id="contacto" className="section-shell">
      <p className="eyebrow">Contacto</p>
      <h2 className="section-title">Hablemos de tu proyecto</h2>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <p className="text-slate-400">
            ¿Tienes una idea, una vacante o una colaboración en mente?
            Escríbeme y te responderé lo antes posible.
          </p>
          <div className="space-y-4 text-sm">
            <a
              href={`mailto:${OWNER.email}`}
              className="flex items-center gap-3 text-slate-300 transition hover:text-accent-300"
            >
              <span className="rounded-lg bg-accent-500/15 p-2.5 text-accent-400">
                <Mail size={18} />
              </span>
              {OWNER.email}
            </a>
            <p className="flex items-center gap-3 text-slate-300">
              <span className="rounded-lg bg-accent-500/15 p-2.5 text-accent-400">
                <MapPin size={18} />
              </span>
              {OWNER.location} · Disponible en remoto
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-400">Nombre</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tu nombre"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-400">Correo</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com"
                className={inputClass}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-400">Mensaje</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntame sobre tu proyecto..."
              className={`${inputClass} resize-none`}
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white transition hover:bg-accent-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
          >
            <Send size={17} /> Enviar mensaje
          </button>
        </form>
      </div>
    </section>
  );
}
