import type { Project } from "./types";
import capture01 from "../../assets/utn-necochea/utn-necochea-01.jpg";
import capture02 from "../../assets/utn-necochea/utn-necochea-02.jpg";
import capture03 from "../../assets/utn-necochea/utn-necochea-03.jpg";
import capture04 from "../../assets/utn-necochea/utn-necochea-04.jpg";

// Capturas 1910×943 (browser full-screen) re-escaladas a 1440×711.
const ASPECT = "1910 / 943";

export const utnNecochea: Project = {
  id: "utn-necochea",
  title: "UTN Extensión Áulica Necochea",
  // Cliente y no "academico": la universidad hizo de comitente real del
  // sistema (pidió, revisó y recibió), que es lo que le interesa a alguien
  // que mira el portafolio — más que el hecho de que fuera una tesis.
  role: "cliente",
  // El código es privado (repo del equipo) — solo link al sitio. Ya no es
  // una preview estática: el backend está levantado en el VPS propio
  // (utn-api.augustofc.com), así que las noticias, el registro y los
  // perfiles funcionan de verdad contra la API.
  status: "activo",
  featured: true,
  summary:
    "Tesis de la Tecnicatura Universitaria en Programación (UTN FR Mar del " +
    "Plata), desarrollada en equipo de cuatro: plataforma web para la " +
    "Extensión Áulica Necochea con portal de noticias (con scraper propio), " +
    "registro y login con captcha, perfiles de alumno y administrador, carga " +
    "de comprobantes de pago y sección institucional. Estuve a cargo del " +
    "frontend y participé en los servicios de backend.",
  stack: ["HTML5", "CSS3", "React", "Node.js", "Express", "PostgreSQL", "Docker", "GitHub Actions"],
  links: {
    demo: "https://utnnecochea.vercel.app/",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // hero del portal
    { type: "image", src: capture02, aspect: ASPECT }, // noticias (scraper)
    { type: "image", src: capture03, aspect: ASPECT }, // registro + captcha
    { type: "image", src: capture04, aspect: ASPECT }, // preinscripción + contacto
  ],
};
