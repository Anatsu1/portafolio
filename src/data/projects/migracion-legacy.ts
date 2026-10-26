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
  featured: true,
  summary:
    "Reemplazo del sistema de gestión que una empresa con larga trayectoria " +
    "en el mercado local usa desde 1996, escrito en QuickBasic para DOS y " +
    "sin documentación.\n\n" +
    "Datos: ingeniería inversa, byte a byte, de los 21 archivos binarios del " +
    "sistema original, sin perder un solo registro: 74.400 registros " +
    "recuperados y 5.234 unidades migradas a PostgreSQL. Un solo comando " +
    "repite toda la extracción el día del traspaso, la compara con la " +
    "anterior y genera automáticamente las planillas Excel del histórico.\n\n" +
    "Aplicación: de escritorio y multiusuario en la red local, con tres " +
    "perfiles cuyos permisos se hacen cumplir en la propia base y registro " +
    "de quién cargó y quién modificó cada unidad. Alta con legajo " +
    "automático, validación de dominios en formato viejo y nuevo, baja " +
    "lógica y reconexión sin perder lo que se estaba cargando. Más de 3.900 " +
    "pruebas automatizadas.\n\n" +
    "En desarrollo (versión 0.2). Siguen clientes y asesores; búsquedas, " +
    "listados y estadísticas con exportación a Excel; etiquetas para las " +
    "carpetas, fotos de las unidades y copias de seguridad automáticas " +
    "cifradas. Las capturas son de la demo, con datos inventados.",
  stack: ["TypeScript", "React", "Electron", "Node.js", "PostgreSQL"],
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // inicio con el resumen de unidades
    { type: "image", src: capture02, aspect: ASPECT }, // pantalla de espera ante una consulta lenta
    { type: "image", src: capture03, aspect: ASPECT }, // resultados de una búsqueda por dominio
    { type: "image", src: capture04, aspect: ASPECT }, // usuarios y perfiles
    { type: "video", src: arranque, poster: arranquePoster, aspect: ASPECT }, // animación de inicio
  ],
};
