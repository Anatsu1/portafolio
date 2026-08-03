import type { Project } from "./types";
import capture01 from "../../assets/portafolio/portafolio-01.jpg";
import capture02 from "../../assets/portafolio/portafolio-02.jpg";
import capture03 from "../../assets/portafolio/portafolio-03.jpg";

// Capturas del propio sitio a 1910×943 (viewport de escritorio, tema
// oscuro), re-escaladas a 1440×711. Se sacan con el navegador headless
// contra `npm run dev` — si cambia el diseño, se vuelven a sacar.
const ASPECT = "1910 / 943";

export const portafolio: Project = {
  id: "portafolio",
  title: "Portafolio",
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "El sitio que estás viendo, hecho como una single page application en " +
    "React + TypeScript corriendo sobre Vite. El modo claro/oscuro está " +
    "resuelto con variables CSS + Tailwind, y la animación del hero se armó " +
    "con Google Flow y se sincroniza con GSAP para una entrada llamativa. " +
    "La red de skills de esta misma sección funciona como filtro de los " +
    "proyectos.",
  // La lista sale de docs/stack-por-proyecto.md. Vite y GSAP se cuentan en
  // el resumen pero no van acá: el stack alimenta el árbol, y el árbol solo
  // lleva las tecnologías de esa lista.
  stack: ["HTML5", "CSS3", "React", "TypeScript", "Tailwind CSS", "Git", "GitHub Actions"],
  links: {
    demo: "https://augustofc.com",
    // Sin repo: hoy es privado. Si se hace público, agregar acá
    // "https://github.com/Anatsu1/portafolio".
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // hero con el brazo
    { type: "image", src: capture02, aspect: ASPECT }, // red de skills filtrando
    { type: "image", src: capture03, aspect: ASPECT }, // sobre mí + fichas
  ],
};
