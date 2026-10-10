import type { Project } from "./types";
import capture01 from "../../assets/portafolio/portafolio-01.jpg";
import capture02 from "../../assets/portafolio/portafolio-02.jpg";
import capture03 from "../../assets/portafolio/portafolio-03.jpg";
import capture04 from "../../assets/portafolio/portafolio-04.jpg";
import capture05 from "../../assets/portafolio/portafolio-05.jpg";

// Capturas del propio sitio (viewport de escritorio, tema claro), escaladas a
// 1440 de ancho y recortadas desde arriba a 1440×711 (la proporción común de
// todas las fichas). Si cambia el diseño, se vuelven a sacar.
const ASPECT = "1910 / 943";

export const portafolio: Project = {
  id: "portafolio",
  title: "Portafolio",
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "El sitio que estás viendo: una single page en React + TypeScript sobre " +
    "Vite y Tailwind, con modo claro/oscuro. Tiene un laboratorio interactivo " +
    "donde un brazo robótico en 3D (Three.js) mueve cajas que abren cada " +
    "sección, con una versión 2D para el celular, y un mapa de skills que " +
    "filtra los proyectos. Se despliega con Docker y GitHub Actions en mi " +
    "propio VPS.",
  // La lista sale de docs/stack-por-proyecto.md. Vite y GSAP se cuentan en
  // el resumen pero no van acá: el stack alimenta el árbol, y el árbol solo
  // lleva las tecnologías de esa lista.
  stack: ["HTML5", "CSS3", "React", "TypeScript", "Tailwind CSS", "Git", "Docker", "GitHub Actions"],
  links: {
    demo: "https://augustofc.com",
    repo: "https://github.com/Anatsu1/portafolio",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // hero con el brazo en plano técnico
    { type: "image", src: capture02, aspect: ASPECT }, // laboratorio 3D (entorno bosque)
    { type: "image", src: capture03, aspect: ASPECT }, // trayectoria: tres frentes y línea de tiempo
    { type: "image", src: capture04, aspect: ASPECT }, // mapa de skills filtrando proyectos
    { type: "image", src: capture05, aspect: ASPECT }, // placa de características + contacto
  ],
};
