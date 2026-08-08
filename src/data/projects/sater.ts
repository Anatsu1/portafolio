import type { Project } from "./types";
import capture01 from "../../assets/sater/sater-01.jpg";
import capture02 from "../../assets/sater/sater-02.jpg";

// El stack lleva sólo SQLite a propósito: VB.NET, Windows Forms y Access no
// son nodos del árbol de skills y se cuentan en el resumen, porque no son
// tecnologías que tenga sentido ofrecer como filtro.
//
// Capturas 1440×863 nativas, tomadas con la aplicación corriendo sobre Mono
// en Linux con la base ya migrada a SQLite (el .mdb original no abre fuera
// de Windows), a JPEG q88. Son dos: el sistema tiene pocas pantallas que
// valga la pena mostrar.
const ASPECT = "1440 / 863";

export const sater: Project = {
  id: "sater",
  title: "SATER — Asesor de energía solar",
  role: "formacion",
  status: "activo",
  featured: false,
  summary:
    "Aplicación de escritorio en VB.NET y Windows Forms hecha en la " +
    "secundaria (2022) y rescatada hace poco: calcula el consumo eléctrico " +
    "de un hogar a partir de los electrodomésticos que declara el usuario y " +
    "recomienda qué paneles solares —y cuántos— hacen falta para cubrirlo, " +
    "filtrando el catálogo por los watt-pico necesarios. La base original " +
    "era Access; para poder correrlo fuera de Windows se migró a SQLite y " +
    "todo el acceso a datos quedó detrás de una capa única con el proveedor " +
    "configurable. Al revisarlo aparecieron trece errores, tres de ellos " +
    "críticos: las altas nunca grababan, el consumo se truncaba a números " +
    "enteros y la pantalla de recomendación leía las columnas corridas. " +
    "Están documentados y corregidos.",
  stack: ["SQLite"],
  links: {
    repo: "https://github.com/Anatsu1/sater",
  },
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // menú principal
    { type: "image", src: capture02, aspect: ASPECT }, // cálculo de consumo
  ],
};
