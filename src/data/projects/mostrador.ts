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
// Capturas 1440×900 nativas del README del proyecto (la del catálogo venía
// 1440×935 y se recortó desde arriba, como hace el carrusel con su
// `object-top`), a JPEG q88.
const ASPECT = "1440 / 900";

export const mostrador: Project = {
  id: "mostrador",
  title: "Mostrador — Gestión de ferretería",
  role: "cliente",
  status: "activo",
  featured: false,
  summary:
    "Sistema de gestión para el mostrador de una ferretería, desarrollado " +
    "para un cliente real en 2024 junto a otro programador: catálogo con " +
    "control de stock mínimo, ventas con carrito y búsqueda en vivo, remito " +
    "en PDF, cuenta corriente de clientes con el precio del día de la venta " +
    "al lado del actual, importación masiva desde Excel y tres roles de " +
    "acceso. Está escrito en PHP plano sobre MySQL, sin framework: cada " +
    "pantalla renderiza su propio HTML y consulta la base directamente, y el " +
    "buscador actualiza resultados sin recargar. El repositorio se publica " +
    "como demo con datos ficticios, empaquetado con Docker Compose para " +
    "levantarlo con un comando.",
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
