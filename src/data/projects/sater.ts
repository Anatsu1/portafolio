import type { Project } from "./types";
import capture01 from "../../assets/sater/sater-01.jpg";
import capture02 from "../../assets/sater/sater-02.jpg";

// El stack lleva sólo SQLite a propósito: VB.NET, Windows Forms y Access no
// son nodos del árbol de skills y se cuentan en el resumen, porque no son
// tecnologías que tenga sentido ofrecer como filtro.
//
// Capturas 1440×711, tomadas con la aplicación corriendo sobre Mono en Linux
// con la base ya migrada a SQLite (el .mdb original no abre fuera de
// Windows), a JPEG q88. Son dos: el sistema tiene pocas pantallas que valga
// la pena mostrar. Misma proporción que el resto del sitio.
const ASPECT = "1440 / 711";

export const sater: Project = {
  id: "sater",
  title: "SATER — Asesor de energía solar",
  // "personal" y no "formacion": el sello de `formacion` dice "Certificación"
  // y esto no salió de un curso con certificado, fue un trabajo de escuela
  // que encaré por mi cuenta.
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "Aplicación de escritorio en VB.NET que asesora sobre energía solar: " +
    "calcula el consumo eléctrico de un hogar a partir de los " +
    "electrodomésticos que declara el usuario y recomienda qué paneles —y " +
    "cuántos— hacen falta para cubrirlo. Fue mi primer sistema completo, " +
    "hecho en la secundaria y recuperado años después; lo dejo en el " +
    "portafolio como punto de partida, para que se vea el recorrido. Los " +
    "datos viven en una base local y todo el acceso a datos pasa por una " +
    "única capa, con el proveedor configurable.",
  stack: ["SQLite"],
  links: {
    repo: "https://github.com/Anatsu1/sater",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // menú principal
    { type: "image", src: capture02, aspect: ASPECT }, // cálculo de consumo
  ],
};
