import type { Project } from "./types";
import capture01 from "../../assets/beastore/beastore-01.jpg";
import capture02 from "../../assets/beastore/beastore-02.jpg";
import capture03 from "../../assets/beastore/beastore-03.jpg";
import capture04 from "../../assets/beastore/beastore-04.jpg";

// No hay demo online porque necesita una instancia de MongoDB propia; se
// corre en local con `./mvnw spring-boot:run`.
//
// Capturas 1440×711, recortadas desde arriba para que todos los proyectos
// del sitio compartan la misma proporción y las fichas midan igual.
const ASPECT = "1440 / 711";

export const beastore: Project = {
  id: "beastore",
  title: "BeaStore — Catálogo con MongoDB",
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "Panel de administración de un catálogo de productos electrónicos, hecho " +
    "como demo de mi trabajo del lado del servidor con Java. Permite dar de " +
    "alta, listar, editar y eliminar productos con sus fotos, valida los " +
    "datos antes de guardarlos y arma en vivo la etiqueta de estante de cada " +
    "artículo mientras se carga. Está construido sobre Spring Boot y MongoDB " +
    "para mostrar cómo resuelvo un CRUD completo contra una base no " +
    "relacional, con la interfaz escrita a mano, sin frameworks de CSS ni de " +
    "JavaScript.",
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
