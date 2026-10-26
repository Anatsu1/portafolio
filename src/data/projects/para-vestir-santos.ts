import type { Project } from "./types";
import capture01 from "../../assets/para-vestir-santos/pvs-01.jpg";

// Cliente real, nombrado con su permiso. Sin repo público. La captura es
// del estado actual (26/10/2026): la base de la aplicación funciona y las
// secciones del menú todavía dicen «Próximamente». Sumar capturas a medida
// que se habiliten.
const ASPECT = "1440 / 711";

export const paraVestirSantos: Project = {
  id: "para-vestir-santos",
  title: "Para Vestir Santos — Ventas y stock",
  role: "cliente",
  status: "en-progreso",
  featured: false,
  summary:
    "Sistema de ventas y stock para Para Vestir Santos, una tienda " +
    "holística de Necochea, que se va a sincronizar con su tienda online en " +
    "Tiendanube: cada venta del local va a descontar el stock de la web al " +
    "instante y los pedidos de la web van a entrar solos, con una cola que " +
    "reintenta si se corta internet. En desarrollo: ya funcionan la " +
    "aplicación de escritorio, el servidor local y la base de datos con " +
    "migraciones, y la integración con la API de Tiendanube pasó su prueba " +
    "con un pedido de punta a punta. Ventas, stock y etiquetas con código " +
    "de barras son las próximas secciones.",
  stack: ["TypeScript", "React", "Tailwind CSS", "Node.js", "Express", "SQLite"],
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // inicio con el menú de lo que viene
  ],
};
