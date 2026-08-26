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
  status: "activo",
  featured: false,
  summary:
    "Trabajo grupal del curso Codo a Codo (Argentina, 2024): plataforma para " +
    "descubrir animes, mangas y música relacionada, con recomendaciones que " +
    "enlazan directo a dónde verlos y leerlos, sección de música, foro con " +
    "temas y respuestas, y cuentas de usuario con registro y login. Los datos " +
    "de series salen de la API de AniList. El frontend es HTML, CSS y " +
    "JavaScript vanilla —sin framework ni build step—, servido estático en " +
    "Vercel, que reenvía las llamadas a una API REST en Flask sobre " +
    "PostgreSQL: el navegador habla siempre con un mismo origen, sin CORS ni " +
    "contenido mixto. La API corre en mi VPS como contenedor detrás de " +
    "Traefik y se despliega sola en cada push, con la imagen ARM64 construida " +
    "en GitHub Actions. Está pensada para vivir expuesta: contraseñas " +
    "hasheadas con pbkdf2, sesiones que vencen, límites de tamaño y de " +
    "frecuencia por IP, y cupos por tabla.",
  stack: [
    "HTML5",
    "CSS3",
    "JavaScript",
    "Python",
    "Flask",
    "PostgreSQL",
    "Docker",
    "GitHub Actions",
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
