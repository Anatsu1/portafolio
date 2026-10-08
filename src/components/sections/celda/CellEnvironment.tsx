import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sky } from "@react-three/drei";
import type { Group, Texture } from "three";
import type { EnvId } from "./environments";
import { ARC_RADIUS } from "./cellLayout";
import { beltTexture, concreteTexture, grassTexture, panelWallTexture } from "./proceduralTextures";

type Theme = "light" | "dark";
type EnvProps = { theme: Theme; rim: string };

/** Plataforma circular bajo el brazo y el aro que marca el alcance. */
function Pad({ color, ring, roughness = 0.75 }: { color: string; ring: string; roughness?: number }) {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.0, 0]}>
        <circleGeometry args={[3.4, 72]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={roughness} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]}>
        <ringGeometry args={[ARC_RADIUS + 0.55, ARC_RADIUS + 0.59, 96]} />
        <meshBasicMaterial color={ring} transparent opacity={0.6} />
      </mesh>
    </>
  );
}

/** Lámpara industrial colgante: pantalla cónica y disco emisivo. */
function Lamp({ x, z = -2, y = 6.6 }: { x: number; z?: number; y?: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
        <meshStandardMaterial color="#1a1d1f" />
      </mesh>
      <mesh>
        <coneGeometry args={[0.75, 0.45, 24, 1, true]} />
        <meshStandardMaterial color="#2c3235" metalness={0.7} roughness={0.5} side={2} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#fff3d6" />
      </mesh>
      <pointLight position={[0, -0.6, 0]} intensity={14} distance={11} decay={2} color="#ffe9c4" />
    </group>
  );
}

/** Nave industrial: piso de hormigón, paredes de chapa, tuberías, columnas y lámparas. */
function Hall({ rim, children }: { rim: string; children?: React.ReactNode }) {
  const floor = useMemo(() => concreteTexture(), []);
  const wall = useMemo(() => panelWallTexture(), []);
  const sideWall = useMemo(() => panelWallTexture("#23282b", 8, 3), []);
  return (
    <>
      <color attach="background" args={["#090b0c"]} />
      <fog attach="fog" args={["#090b0c", 14, 42]} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={floor} metalness={0.2} roughness={0.85} />
      </mesh>
      <mesh position={[0, 4.5, -9]}>
        <planeGeometry args={[44, 9]} />
        <meshStandardMaterial map={wall} metalness={0.4} roughness={0.7} />
      </mesh>
      {[-16, 16].map((x) => (
        <mesh key={x} position={[x, 4.5, -3]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[24, 9]} />
          <meshStandardMaterial map={sideWall} metalness={0.4} roughness={0.7} />
        </mesh>
      ))}

      {/* Columnas y tuberías sobre la pared del fondo */}
      {[-9, -3, 3, 9].map((x) => (
        <mesh key={x} position={[x, 4.5, -8.6]}>
          <boxGeometry args={[0.6, 9, 0.6]} />
          <meshStandardMaterial color="#1c2023" metalness={0.8} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 7.4, -8.2]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.22, 0.22, 40, 20]} />
        <meshStandardMaterial color="#3a4247" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 6.8, -8.2]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.16, 0.16, 40, 20]} />
        <meshStandardMaterial color="#8c2f26" metalness={0.6} roughness={0.5} />
      </mesh>

      {[-5, 0, 5].map((x) => (
        <Lamp key={x} x={x} />
      ))}

      <Pad color="#15191b" ring={rim} />
      <Environment resolution={256} key="hall-env">
        <Lightformer form="rect" intensity={2} position={[0, 7, -1]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} color="#fff0d8" />
        <Lightformer form="rect" intensity={1.6} position={[6, 2, 5]} rotation-y={-Math.PI / 2.4} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[-6, 2, 4]} rotation-y={Math.PI / 2.4} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={2.4} color={rim} position={[-4, 3, -6]} scale={6} />
      </Environment>
      <directionalLight position={[4, 7, 5]} intensity={1.3} />
      <directionalLight position={[-5, 3, -4]} intensity={1.2} color={rim} />
      {children}
    </>
  );
}

/** Cinta transportadora con cajas que avanzan, detrás del brazo. */
function Conveyor() {
  const belt = useMemo(() => beltTexture(), []);
  const crates = useRef<Group>(null);
  useFrame((_, dt) => {
    (belt as Texture).offset.x -= dt * 0.12;
    const g = crates.current;
    if (!g) return;
    g.children.forEach((c) => {
      c.position.x += dt * 0.7;
      if (c.position.x > 12) c.position.x = -12;
    });
  });
  return (
    <group position={[0, 0, -4.2]}>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[26, 0.2, 1.6]} />
        <meshStandardMaterial color="#202528" metalness={0.8} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.63, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[26, 1.35]} />
        <meshStandardMaterial map={belt} metalness={0.3} roughness={0.8} />
      </mesh>
      {[-0.82, 0.82].map((z) => (
        <mesh key={z} position={[0, 0.7, z]}>
          <boxGeometry args={[26, 0.12, 0.08]} />
          <meshStandardMaterial color="#d9a400" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => -12.5 + i * 2).map((x) => (
        <mesh key={x} position={[x, 0.26, 0]}>
          <boxGeometry args={[0.18, 0.52, 1.3]} />
          <meshStandardMaterial color="#1a1e20" metalness={0.8} roughness={0.5} />
        </mesh>
      ))}
      <group ref={crates}>
        {[-11, -7, -3, 1, 5, 9].map((x, i) => (
          <mesh key={x} position={[x, 1.0, 0]} rotation-y={i * 0.3}>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color={i % 2 ? "#3a4247" : "#2b3135"} metalness={0.6} roughness={0.55} />
          </mesh>
        ))}
      </group>
      {/* Pórtico sobre la cinta */}
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 2.6, 0]}>
          <boxGeometry args={[0.3, 5.2, 0.3]} />
          <meshStandardMaterial color="#d9a400" metalness={0.5} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[18.3, 0.3, 0.4]} />
        <meshStandardMaterial color="#d9a400" metalness={0.5} roughness={0.55} />
      </mesh>
    </group>
  );
}

const TREES: [number, number, number][] = [
  [-12, -9, 1.1], [-17, -3, 1.3], [-9, -16, 1.4], [11, -11, 1.2], [16, -4, 1.4], [20, -14, 1.5],
  [-22, -12, 1.6], [6, -20, 1.5], [-3, -24, 1.7], [14, 4, 1.1], [-15, 6, 1.2], [24, -2, 1.4],
];

/** Pradera abierta: cielo procedural, césped, colinas y árboles de pocos polígonos. */
function Meadow({ theme }: { theme: Theme }) {
  const dusk = theme === "dark";
  const grass = useMemo(
    () => (dusk ? grassTexture("#2c4a22", "#223a1a", "#3b6130", 20) : grassTexture("#436f2e", "#335623", "#5a8540", 20)),
    [dusk]
  );
  const sky = dusk ? "#31405c" : "#a8cdf0";
  const hill = dusk ? "#23401f" : "#4a7d3b";
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[dusk ? "#3a4560" : "#bcd9f2", 18, 70]} />
      <Sky
        distance={450000}
        sunPosition={dusk ? [12, 0.9, -14] : [12, 7, -14]}
        turbidity={dusk ? 9 : 3}
        rayleigh={dusk ? 3 : 1.1}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
        <circleGeometry args={[90, 64]} />
        <meshStandardMaterial map={grass} roughness={1} metalness={0} />
      </mesh>
      {([[-24, -38, 20], [20, -42, 24], [0, -55, 34]] as const).map(([x, z, s], i) => (
        <mesh key={i} position={[x, -s * 0.12, z]} scale={[s, s * 0.22, s * 0.5]}>
          <sphereGeometry args={[1, 24, 12]} />
          <meshStandardMaterial color={hill} roughness={1} metalness={0} />
        </mesh>
      ))}
      {TREES.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.12, 0.17, 1.4, 6]} />
            <meshStandardMaterial color="#4a3a2a" roughness={1} />
          </mesh>
          <mesh position={[0, 2.0, 0]}>
            <coneGeometry args={[0.95, 2.0, 7]} />
            <meshStandardMaterial color={dusk ? "#1f3d22" : "#2f6b2e"} roughness={1} />
          </mesh>
          <mesh position={[0, 3.0, 0]}>
            <coneGeometry args={[0.7, 1.6, 7]} />
            <meshStandardMaterial color={dusk ? "#264a28" : "#3a7d37"} roughness={1} />
          </mesh>
        </group>
      ))}
      <Pad color={dusk ? "#3a3f43" : "#8d9296"} ring={dusk ? "#ffb070" : "#ffffff"} roughness={0.9} />
      <Environment resolution={256} key={dusk ? "m-dusk" : "m-day"}>
        <Lightformer form="rect" intensity={dusk ? 3 : 5.5} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} color={dusk ? "#7b8fc4" : "#cfe6ff"} />
        <Lightformer form="rect" intensity={dusk ? 6 : 6} position={[8, 3, -9]} rotation-y={-Math.PI / 4} scale={[10, 5, 1]} color={dusk ? "#ff9a5a" : "#fff1d6"} />
        <Lightformer form="rect" intensity={dusk ? 2.2 : 3} position={[-7, 2, 5]} rotation-y={Math.PI / 3} scale={[8, 4, 1]} color={dusk ? "#46557f" : "#bcd9f2"} />
      </Environment>
      <hemisphereLight args={[dusk ? "#6f82b8" : "#dff0ff", dusk ? "#1d2a18" : "#4a6b3a", dusk ? 0.7 : 0.9]} />
      <directionalLight position={[8, 7, -6]} intensity={dusk ? 2.2 : 2.6} color={dusk ? "#ff9a5a" : "#fff1d6"} />
      <directionalLight position={[-4, 5, 6]} intensity={dusk ? 0.5 : 0.8} color={dusk ? "#7b8fc4" : "#cfe6ff"} />
    </>
  );
}

type CellEnvironmentProps = EnvProps & { env: EnvId };

export default function CellEnvironment({ env, theme, rim }: CellEnvironmentProps) {
  if (env === "pradera") return <Meadow theme={theme} />;
  return <Hall rim={rim}>{env === "linea" ? <Conveyor /> : null}</Hall>;
}
