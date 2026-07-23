import type { Project } from "./types";
import capture01 from "../../assets/ejemplo-api/ejemplo-api-01.jpg";
import capture02 from "../../assets/ejemplo-api/ejemplo-api-02.jpg";

// TODO(cesar): PROYECTO DE EJEMPLO para probar el slider y el filtro —
// reemplazar título, summary, stack y capturas por un proyecto real de
// backend. Las capturas placeholder viven en assets/ejemplo-api/
// (borrarlas al reemplazar).
const ASPECT = "1440 / 711";

export const ejemploApi: Project = {
  id: "ejemplo-api",
  title: "Ejemplo: API REST",
  role: "personal",
  status: "en-progreso",
  featured: false,
  summary:
    "Proyecto de ejemplo para probar el slider (reemplazar con datos " +
    "reales). Acá iría una API REST tipada: endpoints documentados, " +
    "autenticación, tests y base de datos relacional, con foco en buenas " +
    "prácticas de arquitectura y manejo de errores.",
  stack: ["Node.js", "Express", "TypeScript", "PostgreSQL"],
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT },
    { type: "image", src: capture02, aspect: ASPECT },
  ],
};
