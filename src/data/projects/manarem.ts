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
  // El frontend está completo y navegable, y la API ya está terminada y
  // probada, pero la demo corre con datos mock hasta publicarla en el VPS.
  // Cuando el backend esté online: "activo".
  status: "preview",
  featured: false,
  summary:
    "Trabajo grupal del curso Codo a Codo (Argentina, 2024): plataforma para " +
    "descubrir animes, mangas y música relacionada, con recomendaciones que " +
    "enlazan directo a dónde verlos y leerlos, sección de música, foro con " +
    "temas y respuestas, y cuentas de usuario con registro y login. Los datos " +
    "de series salen de la API de AniList. El frontend es HTML, CSS y " +
    "JavaScript vanilla —sin framework ni build step—, pensado para servirse " +
    "estático. Detrás hay una API REST en Flask que corre indistintamente " +
    "sobre PostgreSQL o SQLite: el esquema y las consultas son los mismos y se " +
    "elige el motor con una variable de entorno, así el repositorio se clona y " +
    "arranca sin instalar nada. La API está preparada para vivir expuesta en " +
    "un VPS chico —contraseñas hasheadas con pbkdf2, sesiones que vencen, " +
    "límites de tamaño y de frecuencia por IP, y cupos por tabla— y se " +
    "despliega con gunicorn detrás de un proxy inverso.",
  stack: [
    "HTML5",
    "CSS3",
    "JavaScript",
    "Python",
    "Flask",
    "PostgreSQL",
    "SQLite",
  ],
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
