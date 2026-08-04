import type { Project } from "./types";
import capture01 from "../../assets/manarem/manarem-01.jpg";
import capture02 from "../../assets/manarem/manarem-02.jpg";
import capture03 from "../../assets/manarem/manarem-03.jpg";

// Capturas 1910×943 (browser full-screen) re-escaladas a 1440×711, sacadas
// contra la demo de Vercel con el navegador headless.
const ASPECT = "1910 / 943";

export const manarem: Project = {
  id: "manarem",
  title: "Manarem",
  role: "formacion",
  // El frontend está completo y navegable, pero la demo corre con datos mock
  // hasta volver a levantar la API. Cuando el backend esté online: "activo".
  status: "preview",
  featured: false,
  summary:
    "Trabajo grupal del curso Codo a Codo (Argentina, 2024): plataforma para " +
    "descubrir animes, mangas y música relacionada, con recomendaciones que " +
    "enlazan directo a dónde verlos y leerlos, sección de música, foro con " +
    "temas y respuestas, y cuentas de usuario con registro y login. Los datos " +
    "de series salen de la API de AniList. El frontend es HTML, CSS y " +
    "JavaScript vanilla —sin framework ni build step— y detrás hay una API " +
    "REST en Flask sobre SQLite, con las contraseñas hasheadas.",
  stack: ["HTML5", "CSS3", "JavaScript", "Python", "Flask", "SQLite"],
  links: {
    demo: "https://manarem.vercel.app/",
    repo: "https://github.com/Anatsu1/manarem",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // hero de presentación
    { type: "image", src: capture02, aspect: ASPECT }, // nuevo en el mundo otaku
    { type: "image", src: capture03, aspect: ASPECT }, // form de iniciar sesión
  ],
};
