import { useState } from "react";
import { Check, Copy, Mail, MailCheck, MapPin, Send } from "lucide-react";
import { OWNER } from "../../data";
import { useContactForm } from "../../hooks/useContactForm";
import { Reveal } from "../Reveal";
import SectionHeading from "../SectionHeading";
import Rivets from "../industrial/Rivets";
import MarqueeStrip from "../industrial/MarqueeStrip";

type Audience = "freelance" | "empresa";

// Empresas primero (orden de tabs = orden de estas keys) y como default:
// el objetivo principal es conseguir trabajo en relación de dependencia.
const AUDIENCE_COPY: Record<
  Audience,
  { banner: string; label: string; heading: string; description: string }
> = {
  empresa: {
    banner: "Sumá talento a tu equipo",
    label: "Empresas",
    heading: "¿Buscás sumar talento a tu equipo?",
    description:
      "Estoy abierto a posiciones de tiempo completo en desarrollo web. Contame sobre la vacante y coordinamos una charla.",
  },
  freelance: {
    banner: "Hablemos de tu proyecto",
    label: "Clientes / Freelance",
    heading: "Hablemos de tu proyecto",
    description:
      "¿Tenés una idea, un sitio para armar o algo que mejorar? Escribime y te respondo lo antes posible.",
  },
};

export default function Contact() {
  const [audience, setAudience] = useState<Audience>("empresa");
  const copy = AUDIENCE_COPY[audience];
  const { form, setForm, sent, copied, handleSubmit, copyEmail } = useContactForm(
    OWNER.email,
    copy.label
  );

  const inputClass =
    "w-full rounded-xl border border-border/10 bg-surface/70 px-4 py-3 text-sm text-body " +
    "placeholder:text-muted transition focus:border-brand-primary/60 focus:outline-none " +
    "focus:ring-2 focus:ring-brand-primary/30";

  return (
    <section id="contacto" className="section-shell">
      <Reveal>
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
                ? "bg-brand-primary text-on-brand"
                : "text-muted hover:text-body"
            }`}
          >
            {AUDIENCE_COPY[key].label}
          </button>
        ))}
        </div>

        <div className="mt-6">
          <SectionHeading key={audience} index="05" eyebrow="Escribime" title={copy.heading} />
        </div>
      </Reveal>

      {/* Placa de cierre: franja de seguridad, texto en bucle y remaches (el
          mismo vocabulario del laboratorio), con el cartel según la audiencia. */}
      <Reveal
        delay={0.1}
        className="relative mt-10 overflow-hidden rounded-3xl border border-brand-primary/30 bg-gradient-to-br from-brand-primary/10 via-surface/60 to-surface/30"
      >
        <Rivets />
        <div aria-hidden className="hazard-stripe h-1.5" />
        <div className="border-b border-border/10">
          <MarqueeStrip key={audience} phrase={copy.banner} className="text-brand-primary/80" />
        </div>
        <div className="grid gap-10 p-7 md:p-10 lg:grid-cols-[1fr_1.2fr]">
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
              {/* Excepción al `select-none` global (ver index.css): el correo
                  es exactamente el dato que se viene a copiar. */}
              <span className="select-text">{OWNER.email}</span>
            </a>
            <p className="flex items-center gap-3 text-body">
              <span className="rounded-lg bg-brand-primary/15 p-2.5 text-brand-primary">
                <MapPin size={18} />
              </span>
              {OWNER.location} · Disponible en remoto
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border/15 bg-background/50 p-6 md:p-8">
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
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 font-semibold text-on-brand transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <Send size={17} /> Enviar mensaje
          </button>

          {/* Confirmación de que el click hizo algo + plan B cuando el mailto
              no abre ningún cliente (máquinas sin correo configurado): el
              mensaje queda en el form y el mail se puede copiar para escribir
              desde Gmail/Outlook web. */}
          {sent && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-3 text-sm text-body"
            >
              <MailCheck size={18} className="mt-0.5 shrink-0 text-brand-primary" />
              <p>
                Se abrió tu cliente de correo con el mensaje listo para enviar. Si no se abrió,
                escribime directo a{" "}
                <span className="select-text font-semibold text-brand-primary">{OWNER.email}</span>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="ml-2 inline-flex items-center gap-1 rounded-md border border-brand-primary/40 px-2 py-0.5 align-middle text-xs font-semibold text-brand-primary transition hover:bg-brand-primary/15"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copiado" : "Copiar correo"}
                </button>
              </p>
            </div>
          )}
        </form>
        </div>
      </Reveal>
    </section>
  );
}
