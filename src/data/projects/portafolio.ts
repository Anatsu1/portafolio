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
  title: "Este portafolio",
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "El sitio que estás viendo. Single-page en React + TypeScript sobre Vite, " +
    "con modo claro/oscuro resuelto por variables CSS, animación del brazo " +
    "robótico sincronizada con GSAP y una red de skills que funciona como " +
    "filtro de estos mismos proyectos. Se despliega solo: cada push a main " +
    "construye una imagen Docker multi-etapa servida por nginx y la levanta " +
    "en el VPS.",
  // GSAP y Docker son lo que este proyecto aporta al árbol que ningún otro
  // prueba — no están de adorno: la animación del Hero es GSAP y el deploy
  // real es una imagen Docker ARM64 (ver .github/workflows/deploy.yml).
  stack: ["React", "TypeScript", "Vite", "Tailwind CSS", "GSAP", "Docker"],
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
