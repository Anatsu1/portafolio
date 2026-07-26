import type { Project } from "./types";
import capture01 from "../../assets/prestarte/prestarte-01.jpg";
import capture02 from "../../assets/prestarte/prestarte-02.jpg";
import capture03 from "../../assets/prestarte/prestarte-03.jpg";

// Capturas 1917×953 (browser full-screen) re-escaladas a 1440×716 — la
// proporción se declara en `aspect` para que el carrusel no las recorte.
const ASPECT = "1917 / 953";

export const prestarte: Project = {
  id: "prestarte",
  title: "PrestARTE",
  role: "cliente",
  status: "activo",
  featured: true,
  summary:
    "Sitio de intermediación de préstamos en Argentina: adelantos de dinero " +
    "respaldados por tarjeta de crédito, con simulador de cuotas (1, 3, 6 y " +
    "12 pagos) y solicitud por WhatsApp con transferencia inmediata.",
  stack: ["HTML5", "CSS3", "JavaScript", "Bootstrap 5"],
  links: {
    demo: "https://prestarte.vercel.app/",
    repo: "https://github.com/Anatsu1/PrestArte",
  },
  // TODO(cesar): grabar un video corto (10-15s) navegando el sitio en
  // desktop (landscape) y, opcional, otro en el teléfono (portrait) — se
  // encodean con la receta ffmpeg del brazo y se suman acá como
  // { type: "video", src, poster, orientation }. Con 2+ ítems la ficha
  // los rota en carrusel sin tocar ningún componente.
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // hero
    { type: "image", src: capture02, aspect: ASPECT }, // calculadora / simulador
    { type: "image", src: capture03, aspect: ASPECT }, // requisitos + tarjetas
  ],
};
