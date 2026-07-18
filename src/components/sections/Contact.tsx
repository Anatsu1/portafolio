import { useState } from "react";
import { Mail, MapPin, Send } from "lucide-react";
import { OWNER } from "../../data";
import { useContactForm } from "../../hooks/useContactForm";

type Audience = "freelance" | "empresa";

const AUDIENCE_COPY: Record<
  Audience,
  { label: string; heading: string; description: string }
> = {
  freelance: {
    label: "Clientes / Freelance",
    heading: "Hablemos de tu proyecto",
    description:
      "¿Tenés una idea, un sitio para armar o algo que mejorar? Escribime y te respondo lo antes posible.",
  },
  empresa: {
    label: "Empresas",
    heading: "¿Buscás sumar talento a tu equipo?",
    description:
      "Estoy abierto a posiciones de tiempo completo en desarrollo web. Contame sobre la vacante y coordinamos una charla.",
  },
};

export default function Contact() {
  const [audience, setAudience] = useState<Audience>("freelance");
  const copy = AUDIENCE_COPY[audience];
  const { form, setForm, handleSubmit } = useContactForm(
    OWNER.email,
    copy.label
  );

  const inputClass =
    "w-full rounded-xl border border-border/10 bg-surface/70 px-4 py-3 text-sm text-body " +
    "placeholder:text-muted transition focus:border-brand-primary/60 focus:outline-none " +
    "focus:ring-2 focus:ring-brand-primary/30";

  return (
    <section id="contacto" className="section-shell">
      <p className="eyebrow text-brand-primary">Contacto</p>

      <div
        role="tablist"
        aria-label="Audiencia de contacto"
        className="mt-4 inline-flex rounded-xl border border-border/10 bg-surface/70 p-1"
      >
        {(Object.keys(AUDIENCE_COPY) as Audience[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={audience === key}
            onClick={() => setAudience(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              audience === key
                ? "bg-brand-primary text-white"
                : "text-muted hover:text-body"
            }`}
          >
            {AUDIENCE_COPY[key].label}
          </button>
        ))}
      </div>

      <h2 className="section-title mt-6">{copy.heading}</h2>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <p className="text-muted">{copy.description}</p>
          <div className="space-y-4 text-sm">
            <a
              href={`mailto:${OWNER.email}`}
              className="flex items-center gap-3 text-body transition hover:text-brand-primary"
            >
              <span className="rounded-lg bg-brand-primary/15 p-2.5 text-brand-primary">
                <Mail size={18} />
              </span>
              {OWNER.email}
            </a>
            <p className="flex items-center gap-3 text-body">
              <span className="rounded-lg bg-brand-primary/15 p-2.5 text-brand-primary">
                <MapPin size={18} />
              </span>
              {OWNER.location} · Disponible en remoto
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Nombre</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tu nombre"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-muted">Correo</span>
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
            <span className="mb-1.5 block text-sm text-muted">Mensaje</span>
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
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <Send size={17} /> Enviar mensaje
          </button>
        </form>
      </div>
    </section>
  );
}
