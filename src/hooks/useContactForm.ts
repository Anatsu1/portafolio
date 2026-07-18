import { useState, type FormEvent } from "react";

type ContactFormState = { name: string; email: string; message: string };

export function useContactForm(recipientEmail: string, contextLabel?: string) {
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Contacto${contextLabel ? ` (${contextLabel})` : ""} desde el portafolio — ${form.name}`
    );
    const body = encodeURIComponent(
      `Nombre: ${form.name}\nCorreo: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  return { form, setForm, handleSubmit };
}
