import type { Project } from "./types";
import capture01 from "../../assets/mostrador/mostrador-01.jpg";
import capture02 from "../../assets/mostrador/mostrador-02.jpg";
import capture03 from "../../assets/mostrador/mostrador-03.jpg";
import capture04 from "../../assets/mostrador/mostrador-04.jpg";

// No hay link de demo porque la aplicación necesita PHP, MySQL y filesystem
// persistente: no entra en un hosting estático como Vercel. Los datos del
// cliente real se retiraron del repositorio (queda una demo con datos
// ficticios, empaquetada con Docker Compose).
//
// Capturas 1440×711, recortadas desde arriba para que todos los proyectos
// del sitio compartan la misma proporción y las fichas midan igual.
const ASPECT = "1440 / 711";

export const mostrador: Project = {
  id: "mostrador",
  title: "Mostrador — Gestión de ferretería",
  role: "cliente",
  status: "activo",
  featured: false,
  summary:
    "Sistema de gestión para una ferretería, desarrollado a pedido de un " +
    "cliente real junto a otro programador. Centraliza todo el mostrador en " +
    "un solo lugar: catálogo con control de stock, ventas con carrito y " +
    "búsqueda en vivo, remitos en PDF, cuenta corriente de clientes e " +
    "importación desde Excel de más de 3.000 productos, con tres niveles de " +
    "acceso según el " +
    "puesto. Está pensado para un negocio que venía llevando las cuentas en " +
    "papel y planillas sueltas, y para que cualquier empleado pueda usarlo " +
    "sin capacitación previa. El repositorio se publica como demo con datos " +
    "ficticios y se levanta con un solo comando.",
  stack: ["HTML5", "CSS3", "JavaScript", "PHP", "MySQL", "Docker"],
  links: {
    repo: "https://github.com/Anatsu1/sistema-ferreteria",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // panel de inicio
    { type: "image", src: capture02, aspect: ASPECT }, // venta con carrito
    { type: "image", src: capture03, aspect: ASPECT }, // catálogo de productos
    { type: "image", src: capture04, aspect: ASPECT }, // historial del cliente
  ],
};
