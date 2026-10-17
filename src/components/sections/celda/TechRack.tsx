import { useMemo } from "react";
import * as THREE from "three";
import { CELL_TECH } from "../../../data/cellTech";
import { TECH_CENTER, TECH_RADIUS, TECH_SPREAD, cartesian, techSlot } from "./cellLayout";

/** Estante de las cajas de tecnología: losa en arco de acero con cantos de seguridad y un cartel. */
export default function TechRack() {
  const geometry = useMemo(() => {
    const half = TECH_SPREAD / 2 + 0.2;
    const a0 = TECH_CENTER - half;
    const a1 = TECH_CENTER + half;
    const inner = TECH_RADIUS - 0.36;
    const outer = TECH_RADIUS + 0.36;
    // El arco se dibuja en el plano XY (x = r·cos φ, y = −z = r·sin φ) y se tiende sobre el piso.
    const shape = new THREE.Shape();
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const x = outer * Math.cos(a);
      const y = outer * Math.sin(a);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / steps;
      shape.lineTo(inner * Math.cos(a), inner * Math.sin(a));
    }
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); // (x, y, z) → (x, z, −y): el arco queda en el piso, extruido hacia arriba
    return g;
  }, []);
  const edge = useMemo(() => new THREE.EdgesGeometry(geometry, 30), [geometry]);
  const first = cartesian(techSlot(0), 0);
  const last = cartesian(techSlot(CELL_TECH.length - 1), 0);

  return (
    <group>
      <mesh geometry={geometry} position={[0, 0.005, 0]} receiveShadow>
        <meshStandardMaterial color="#1b2024" metalness={0.55} roughness={0.55} />
      </mesh>
      <lineSegments geometry={edge} position={[0, 0.006, 0]}>
        <lineBasicMaterial color="#d9a400" />
      </lineSegments>
      {/* postes de las puntas */}
      {[first, last].map(([x, , z], i) => (
        <mesh key={i} position={[x * 1.17, 0.18, z * 1.17]}>
          <cylinderGeometry args={[0.04, 0.04, 0.36, 10]} />
          <meshStandardMaterial color="#d9a400" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
