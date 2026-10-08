import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

export type Xform = {
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number] | number;
};

const o = new THREE.Object3D();

/**
 * Muchas copias quietas de una geometría en un solo draw call. Las matrices
 * se escriben una vez (no en cada cuadro, a diferencia de `<Instances>` de
 * drei, que las recalcula siempre).
 */
export default function StaticInstances({
  geometry,
  material,
  items,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: readonly Xform[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(...(it.r ?? [0, 0, 0]));
      if (typeof it.s === "number") o.scale.setScalar(it.s);
      else o.scale.set(...(it.s ?? [1, 1, 1]));
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} />;
}
