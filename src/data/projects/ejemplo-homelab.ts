import type { Project } from "./types";
import capture01 from "../../assets/ejemplo-homelab/ejemplo-homelab-01.jpg";
import capture02 from "../../assets/ejemplo-homelab/ejemplo-homelab-02.jpg";

// TODO(cesar): PROYECTO DE EJEMPLO para probar el slider y el filtro —
// reemplazar título, summary, stack y capturas por los datos reales del
// homelab ("cómo armé mi propio servidor") cuando esté listo. Las capturas
// placeholder viven en assets/ejemplo-homelab/ (borrarlas al reemplazar).
const ASPECT = "1440 / 711";

export const ejemploHomelab: Project = {
  id: "ejemplo-homelab",
  title: "Ejemplo: Homelab / VPS",
  role: "personal",
  status: "en-progreso",
  featured: false,
  summary:
    "Proyecto de ejemplo para probar el slider (reemplazar con datos " +
    "reales). Acá va el homelab: cómo armé mi propio servidor, los " +
    "servicios autohosteados, contenedores, redes y todo lo aprendido en " +
    "el camino administrando la infraestructura desde cero.",
  stack: ["Linux", "Docker", "Git"],
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT },
    { type: "image", src: capture02, aspect: ASPECT },
  ],
};
