import type { Project } from "./types";
import capture01 from "../../assets/migracion-legacy/migracion-01.jpg";
import capture02 from "../../assets/migracion-legacy/migracion-02.jpg";
import capture03 from "../../assets/migracion-legacy/migracion-03.jpg";
import capture04 from "../../assets/migracion-legacy/migracion-04.jpg";
import arranque from "../../assets/migracion-legacy/migracion-arranque.mp4";
import arranquePoster from "../../assets/migracion-legacy/migracion-arranque-poster.jpg";

// Cliente real que por ahora no se nombra. Las capturas salen de la demo
// con datos sintéticos (50 unidades y usuarios inventados) y el nombre de
// la empresa se borró de la interfaz antes de capturar: en la barra, el
// pie y la animación de inicio queda solo «Camiones». Sin repo público.
//
// Capturas 1440×711, la misma proporción que el resto del sitio. El video
// va último: mientras un video está activo el carrusel no avanza solo.
const ASPECT = "1440 / 711";

export const migracionLegacy: Project = {
  id: "migracion-legacy",
  title: "Migración de un sistema de gestión heredado",
  role: "cliente",
  status: "en-progreso",
  featured: false,
  summary:
    "Reemplazo del sistema de gestión con el que trabaja desde 1996 una " +
    "empresa con larga trayectoria en el mercado local, escrito en " +
    "QuickBasic para DOS. Se recuperaron los 21 archivos de datos del " +
    "sistema original y se migraron 5.234 registros a PostgreSQL sin perder " +
    "ninguno. La aplicación nueva es de escritorio, multiusuario sobre la " +
    "red local del negocio y con permisos por rol, y la respaldan más de " +
    "3.000 pruebas automatizadas. Las capturas son de la demo, con datos " +
    "inventados.",
  stack: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // inicio con el resumen de unidades
    { type: "image", src: capture02, aspect: ASPECT }, // pantalla de espera ante una consulta lenta
    { type: "image", src: capture03, aspect: ASPECT }, // resultados de una búsqueda por dominio
    { type: "image", src: capture04, aspect: ASPECT }, // usuarios y perfiles
    { type: "video", src: arranque, poster: arranquePoster, aspect: ASPECT }, // animación de inicio
  ],
};
