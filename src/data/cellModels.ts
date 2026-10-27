/**
 * Modelos 3D que se precargan mientras se muestra el loader del vault, para
 * que la celda aparezca completa cuando se abren las puertas. Es la lista del
 * entorno por defecto (línea de montaje); lo demás carga bajo demanda.
 * Al sumar o quitar un modelo de la escena inicial, actualizar esta lista.
 */
export const CELL_PRELOAD_URLS: readonly string[] = [
  "/models/segmento.glb",
  "/models/cuerpo.glb",
  "/models/dedo.glb",
  "/models/caja-cuerpo.glb",
  "/models/caja-tapa.glb",
  "/models/caja-color.webp",
  "/models/caja-mr.webp",
  "/models/caja-normal.webp",
  // entorno "Línea de montaje": cajas de la cinta (y su versión lejana) y piezas de Kenney
  "/models/caja-lite.glb",
  "/models/linea/kit.glb",
  "/models/linea/caja-far.glb",
];
