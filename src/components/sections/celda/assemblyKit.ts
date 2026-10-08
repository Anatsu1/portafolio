import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/*
 * Piezas del Factory Kit de Kenney (CC0, ver docs/creditos-3d.md) juntadas en
 * un solo .glb (`public/models/linea/kit.glb`) con UN material: la paleta
 * original de colores planos se recoloreó a acero oscuro + amarillo
 * seguridad, con un mapa de metal/rugosidad del mismo layout (cada celda de
 * la paleta es un "material"). Así todas las piezas comparten material y
 * conviven con el brazo PBR.
 *
 * Las piezas quedan como nodos raíz con su nombre de Kenney (p. ej.
 * "scanner-high"); el brazo auxiliar conserva su jerarquía de articulaciones.
 */

export const KIT_URL = "/models/linea/kit.glb";
export const LINE_BOX_URL = "/models/caja-lite.glb";

export type KitPiece = "machine-window" | "scanner-high" | "robot-arm-a" | "pipe-large-valve";

export function useKit() {
  const { scene } = useGLTF(KIT_URL);
  return useMemo(() => {
    let material: THREE.MeshStandardMaterial | null = null;
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material as THREE.Material).name === "kit") {
        material = o.material as THREE.MeshStandardMaterial;
      }
    });
    // La paleta es una grilla de colores: con mipmaps, a la distancia los
    // colores vecinos se mezclan. Sin mipmaps cada UV cae en su celda.
    const m = material as THREE.MeshStandardMaterial | null;
    for (const tex of [m?.map, m?.roughnessMap]) {
      if (!tex) continue;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    }
    /** Copia independiente de una pieza (comparte geometría y material). */
    const piece = (name: KitPiece) => {
      // Solo entre los nodos raíz: el propio `scene` podría llamarse igual.
      const src = scene.children.find((c) => c.name === name);
      if (!src) throw new Error(`Falta la pieza ${name} en ${KIT_URL}`);
      return src.clone(true);
    };
    /** Geometría de una pieza de una sola malla (para instanciarla). */
    const geometry = (name: KitPiece) => {
      const src = scene.children.find((c) => c.name === name);
      if (!(src instanceof THREE.Mesh)) throw new Error(`${name} no es una malla simple`);
      return src.geometry as THREE.BufferGeometry;
    };
    return { piece, geometry, material: m! };
  }, [scene]);
}

useGLTF.preload(KIT_URL);
useGLTF.preload(LINE_BOX_URL);
