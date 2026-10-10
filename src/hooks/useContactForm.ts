import { useState, type FormEvent } from "react";

type ContactFormState = { name: string; email: string; message: string };

const COPIED_FEEDBACK_MS = 2000;

export function useContactForm(recipientEmail: string, contextLabel?: string) {
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    message: "",
  });
  // `sent` prende el aviso "se abrió tu cliente de correo" en la UI: es la
  // única señal de que el click hizo algo cuando el mailto no abre nada
  // (máquinas sin cliente de correo configurado — ver abajo).
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(
      `Contacto${contextLabel ? ` (${contextLabel})` : ""} desde el portafolio — ${form.name}`
    );
    const body = encodeURIComponent(
      `Nombre: ${form.name}\nCorreo: ${form.email}\n\n${form.message}`
    );
    // Ancla temporal, NO `window.location.href`: asignar el mailto a la URL
    // hace que la PÁGINA navegue al protocolo, y en máquinas sin cliente de
    // correo registrado (o navegadores viejos) eso termina en una pantalla de
    // error del navegador o en que "no pasa nada" — se sentía roto. Con el
    // ancla la pestaña nunca se mueve; si nadie atiende el protocolo, el
    // aviso `sent` y el botón de copiar quedan como plan B.
    const link = document.createElement("a");
    link.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setSent(true);
  };

  // Plan B cuando el mailto no abre nada: el correo al portapapeles. El
  // mensaje queda escrito en el form para pegarlo a mano donde sea.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(recipientEmail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Portapapeles no disponible (contexto inseguro o permiso denegado):
      // el correo igual queda visible y seleccionable en el aviso.
    }
  };

  return { form, setForm, sent, copied, handleSubmit, copyEmail };
}
