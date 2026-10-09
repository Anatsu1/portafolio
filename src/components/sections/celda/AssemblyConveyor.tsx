import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import StaticInstances, { type Xform } from "./StaticInstances";
import { LINE_BOX_URL } from "./assemblyKit";
import { beltTexture } from "./assemblyTextures";
import {
  BELT_SPEED,
  BELT_TOP,
  BELT_W,
  CURVE_R,
  LINE_BOX_COUNT,
  LINE_BOX_HALF_H,
  LINE_BOX_SCALE,
  SEGMENTS,
  boxAt,
  pointAt,
  type BoxState,
  type PathPoint,
} from "./assemblyPath";

/*
 * La cinta en U (bastidor, banda animada, curvas de rodillos, patas) y las
 * cajas que viajan sobre ella. Las cajas son la caja de carga del proyecto en
 * versión liviana (`caja-lite.glb`, ~5k triángulos) dibujadas con instancing:
 * un draw call por malla del modelo, sin importar cuántas haya.
 */

const FRAME_H = 0.2; // alto del larguero bajo la banda
const SKIRT = BELT_W / 2 + 0.07; // distancia del eje al larguero lateral
const TILE = 1; // la textura de la banda se repite cada 1 unidad

const steel = new THREE.MeshStandardMaterial({ color: "#2b3134", metalness: 0.85, roughness: 0.42 });
const darkSteel = new THREE.MeshStandardMaterial({ color: "#181c1e", metalness: 0.8, roughness: 0.55 });
const yellow = new THREE.MeshStandardMaterial({ color: "#d9a400", metalness: 0.35, roughness: 0.5 });
const chrome = new THREE.MeshStandardMaterial({ color: "#aab2b6", metalness: 1, roughness: 0.25 });

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const roller = new THREE.CylinderGeometry(0.045, 0.045, 1, 10).rotateX(Math.PI / 2);

type Straight = Extract<(typeof SEGMENTS)[number], { kind: "line" }>;
type Curve = Extract<(typeof SEGMENTS)[number], { kind: "arc" }>;

function StraightBelt({ seg, texture }: { seg: Straight; texture: THREE.Texture }) {
  const cx = (seg.x0 + seg.x1) / 2;
  const cz = (seg.z0 + seg.z1) / 2;
  const yaw = Math.atan2(-(seg.z1 - seg.z0), seg.x1 - seg.x0);
  return (
    <group position={[cx, 0, cz]} rotation-y={yaw}>
      {/* banda: un plano con la textura que corre */}
      <mesh position={[0, BELT_TOP, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[seg.len, BELT_W]} />
        <meshStandardMaterial map={texture} metalness={0.1} roughness={0.75} />
      </mesh>
      {/* cajón del bastidor bajo la banda */}
      <mesh position={[0, BELT_TOP - FRAME_H / 2 - 0.01, 0]} geometry={unitBox} material={darkSteel} scale={[seg.len, FRAME_H, BELT_W + 0.02]} />
      {/* largueros laterales en C y guías amarillas encima */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * SKIRT]}>
          <mesh position={[0, BELT_TOP - 0.06, 0]} geometry={unitBox} material={steel} scale={[seg.len, 0.26, 0.05]} />
          <mesh position={[0, BELT_TOP + 0.1, side * 0.01]} geometry={unitBox} material={yellow} scale={[seg.len, 0.045, 0.06]} />
        </group>
      ))}
    </group>
  );
}

/** Curva de rodillos cónicos: la banda no puede doblar, los rodillos sí. */
function RollerCurve({ seg }: { seg: Curve }) {
  // Ángulos de la curva en las convenciones de three (ver comentarios).
  const aMin = Math.min(seg.a0, seg.a1);
  // ringGeometry (plano XY girado −90° en X): θ = −a
  const ringStart = -Math.max(seg.a0, seg.a1);
  // cylinderGeometry: x = r·sen θ, z = r·cos θ  →  θ = π/2 − a
  const cylStart = Math.PI / 2 - Math.max(seg.a0, seg.a1);
  const span = Math.PI / 2;
  const rollers = useMemo<Xform[]>(() => {
    const n = 11;
    return Array.from({ length: n }, (_, i) => {
      const a = aMin + ((i + 0.5) / n) * span;
      return {
        p: [seg.cx + CURVE_R * Math.cos(a), BELT_TOP - 0.045, seg.cz + CURVE_R * Math.sin(a)],
        r: [0, Math.PI / 2 - a, 0],
        s: [1, 1, BELT_W],
      };
    });
  }, [seg, aMin, span]);
  return (
    <group>
      <StaticInstances geometry={roller} material={chrome} items={rollers} />
      <group position={[seg.cx, 0, seg.cz]}>
        <mesh position={[0, BELT_TOP - 0.11, 0]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[CURVE_R - SKIRT, CURVE_R + SKIRT, 24, 1, ringStart, span]} />
          <meshStandardMaterial color="#0e1112" metalness={0.6} roughness={0.7} />
        </mesh>
        {[CURVE_R - SKIRT, CURVE_R + SKIRT].map((r) => (
          <group key={r}>
            <mesh position={[0, BELT_TOP - 0.06, 0]} material={steel}>
              <cylinderGeometry args={[r, r, 0.26, 24, 1, true, cylStart, span]} />
            </mesh>
            <mesh position={[0, BELT_TOP + 0.1, 0]} material={yellow}>
              <cylinderGeometry args={[r, r, 0.045, 24, 1, true, cylStart, span]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Patas (dos postes y un travesaño) cada ~1,6 unidades a lo largo del recorrido. */
function Legs() {
  const items = useMemo(() => {
    const out: Xform[] = [];
    const pt: PathPoint = { x: 0, z: 0, yaw: 0 };
    const total = SEGMENTS.reduce((a, s) => a + s.len, 0);
    for (let s = 0.6; s < total; s += 1.6) {
      pointAt(s, pt);
      const nx = Math.sin(pt.yaw); // normal horizontal al avance
      const nz = Math.cos(pt.yaw);
      for (const side of [-1, 1]) {
        out.push({ p: [pt.x + nx * side * (SKIRT - 0.06), (BELT_TOP - 0.2) / 2, pt.z + nz * side * (SKIRT - 0.06)], r: [0, pt.yaw, 0], s: [0.08, BELT_TOP - 0.2, 0.08] });
        out.push({ p: [pt.x + nx * side * (SKIRT - 0.06), 0.02, pt.z + nz * side * (SKIRT - 0.06)], r: [0, pt.yaw, 0], s: [0.2, 0.04, 0.2] });
      }
      out.push({ p: [pt.x, 0.18, pt.z], r: [0, pt.yaw, 0], s: [0.06, 0.06, SKIRT * 2] });
    }
    return out;
  }, []);
  return <StaticInstances geometry={unitBox} material={darkSteel} items={items} />;
}

type Part = { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 };

/**
 * Cajas de carga sobre la cinta: posición = función del tiempo (ver
 * assemblyPath). Solo se dibujan las visibles: se compactan al principio del
 * buffer y `count` corta el resto (las que esperan en el túnel no cuestan
 * triángulos). Las cajas de los pallets las dibuja el paletizador.
 */
function LineBoxes() {
  const { scene } = useGLTF(LINE_BOX_URL);
  const parts = useMemo<Part[]>(() => {
    scene.updateMatrixWorld(true);
    const list: Part[] = [];
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) list.push({ geometry: o.geometry, material: o.material as THREE.Material, local: o.matrixWorld.clone() });
    });
    return list;
  }, [scene]);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tmp = useMemo(
    () => ({
      st: { s: 0, visible: false, jitter: 0, flip: 0, lap: 0, held: false } as BoxState,
      pt: { x: 0, z: 0, yaw: 0 } as PathPoint,
      o: new THREE.Object3D(),
      m: new THREE.Matrix4(),
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { st, pt, o, m } = tmp;
    let n = 0;
    for (let k = 0; k < LINE_BOX_COUNT; k++) {
      boxAt(k, t, st);
      if (!st.visible) continue;
      pointAt(st.s, pt);
      o.position.set(pt.x, BELT_TOP + LINE_BOX_HALF_H, pt.z);
      o.rotation.set(0, pt.yaw + st.jitter + st.flip, 0);
      o.scale.setScalar(LINE_BOX_SCALE);
      o.updateMatrix();
      parts.forEach((part, j) => refs.current[j]?.setMatrixAt(n, m.multiplyMatrices(o.matrix, part.local)));
      n++;
    }
    refs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <>
      {parts.map((part, j) => (
        <instancedMesh
          key={j}
          ref={(mesh) => {
            refs.current[j] = mesh;
          }}
          args={[part.geometry, part.material, LINE_BOX_COUNT]}
          frustumCulled={false}
        />
      ))}
    </>
  );
}

export default function AssemblyConveyor() {
  const straights = SEGMENTS.filter((s): s is Straight => s.kind === "line");
  const curves = SEGMENTS.filter((s): s is Curve => s.kind === "arc");
  // Una textura por tramo recto (comparten la imagen; cambia la repetición).
  const textures = useMemo(() => straights.map((s) => beltTexture(s.len / TILE)), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    // offset.x negativo = la banda avanza hacia +X local (sentido de las cajas)
    const shift = -((state.clock.elapsedTime * BELT_SPEED) / TILE) % 1;
    for (const t of textures) t.offset.x = shift;
  });

  return (
    <group>
      {straights.map((seg, i) => (
        <StraightBelt key={i} seg={seg} texture={textures[i]} />
      ))}
      {curves.map((seg, i) => (
        <RollerCurve key={i} seg={seg} />
      ))}
      <Legs />
      <LineBoxes />
    </group>
  );
}
