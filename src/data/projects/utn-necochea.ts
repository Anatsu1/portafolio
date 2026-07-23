import type { Project } from "./types";
import capture01 from "../../assets/utn-necochea/utn-necochea-01.jpg";
import capture02 from "../../assets/utn-necochea/utn-necochea-02.jpg";
import capture03 from "../../assets/utn-necochea/utn-necochea-03.jpg";

// Capturas 1910×943 (browser full-screen) re-escaladas a 1440×711.
const ASPECT = "1910 / 943";

export const utnNecochea: Project = {
  id: "utn-necochea",
  title: "UTN Extensión Áulica Necochea",
  role: "academico",
  // El código es privado (repo del equipo) — solo link a la demo. La demo
  // es una preview estática hasta volver a levantar los servicios de
  // backend; cuando eso pase, cambiar status a "activo".
  status: "preview",
  featured: true,
  summary:
    "Tesis de la Tecnicatura Universitaria en Programación (UTN FR Mar del " +
    "Plata), desarrollada en equipo de cuatro: plataforma web para la " +
    "Extensión Áulica Necochea con portal de noticias (con scraper propio), " +
    "registro y login con captcha, perfiles de alumno y administrador, carga " +
    "de comprobantes de pago y sección institucional. Estuve a cargo del " +
    "frontend y participé en los servicios de backend.",
  stack: ["HTML5", "CSS3", "JavaScript", "React", "Node.js", "PostgreSQL"],
  links: {
    demo: "https://utnnecochea.vercel.app/",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // hero del portal
    { type: "image", src: capture02, aspect: ASPECT }, // sección institucional
    { type: "image", src: capture03, aspect: ASPECT }, // registro + captcha
  ],
};
