import type { Project } from "./types";
import capture01 from "../../assets/beastore/beastore-01.jpg";
import capture02 from "../../assets/beastore/beastore-02.jpg";
import capture03 from "../../assets/beastore/beastore-03.jpg";
import capture04 from "../../assets/beastore/beastore-04.jpg";

// No hay demo online porque necesita una instancia de MongoDB propia; se
// corre en local con `./mvnw spring-boot:run`.
//
// Capturas de página completa a 2880 de ancho (retina), re-escaladas a 1440
// y recortadas a 900 de alto desde arriba —cada pantalla tenía un alto
// distinto y el escenario del carrusel usa una sola proporción—, a JPEG q88.
const ASPECT = "1440 / 900";

export const beastore: Project = {
  id: "beastore",
  title: "BeaStore — Catálogo con MongoDB",
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "Panel de administración de un catálogo de productos electrónicos, " +
    "hecho como práctica de Java del lado del servidor: alta, listado, " +
    "edición y baja contra MongoDB, con subida de fotos al disco y el nombre " +
    "del archivo saneado, validación en el servidor con el error debajo del " +
    "campo que lo causó, y una etiqueta de estante que se arma en vivo " +
    "mientras se carga el producto. Corre sobre Spring Boot con Thymeleaf y " +
    "la interfaz está escrita a mano, sin framework de CSS ni de JavaScript. " +
    "Al retomarlo aparecieron varios errores del código original —las fotos " +
    "nunca se servían, las validaciones no se ejecutaban y las credenciales " +
    "de la base estaban en el repositorio— que quedaron documentados y " +
    "corregidos.",
  stack: ["HTML5", "CSS3", "JavaScript", "Java", "Spring Boot", "MongoDB"],
  links: {
    repo: "https://github.com/Anatsu1/store-mongodb",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // portada
    { type: "image", src: capture02, aspect: ASPECT }, // catálogo
    { type: "image", src: capture03, aspect: ASPECT }, // alta con la etiqueta en vivo
    { type: "image", src: capture04, aspect: ASPECT }, // edición
  ],
};
