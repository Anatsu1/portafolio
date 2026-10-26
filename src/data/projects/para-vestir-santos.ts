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
    "Sistema de gestión de ventas y stock para Para Vestir Santos, una " +
    "tienda holística de Necochea que vende en su local y en su tienda " +
    "online de Tiendanube con la misma mercadería.\n\n" +
    "Va a mantener sincronizados productos, precios y stock en los dos " +
    "canales a través de la API oficial: una venta en el mostrador descuenta " +
    "el stock web al instante, los pedidos web entran solos y, si se corta " +
    "internet, los cambios quedan en cola y se reintentan.\n\n" +
    "Incluye venta rápida con lector de código de barras; códigos EAN-13 " +
    "propios e impresión de etiquetas para lo que no trae código de " +
    "fábrica; aumentos de precio por proveedor con historial; clientes con " +
    "su historial de compras; comprobante interno impreso; reportes por " +
    "día, rubro y canal; perfiles de administrador y vendedor; copias de " +
    "seguridad y, en una etapa posterior, facturación electrónica (Factura " +
    "C ante ARCA).\n\n" +
    "En desarrollo: ya funcionan la aplicación de escritorio, el servidor " +
    "local y la base de datos con migraciones verificadas, y la integración " +
    "con la API de Tiendanube pasó su prueba con un pedido de punta a punta. " +
    "Las secciones se habilitan por etapas.",
  stack: ["TypeScript", "React", "Tailwind CSS", "Electron", "Node.js", "Express", "SQLite"],
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // inicio con el menú de lo que viene
  ],
};
