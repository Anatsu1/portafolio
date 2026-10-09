import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useKit } from "./assemblyKit";
import { BELT_TOP, BELT_W, RUN_Z, sOnRun, stationView } from "./assemblyPath";
import { screenTexture, shaftTexture } from "./assemblyTextures";

/*
 * Estaciones del tramo frontal de la línea. Cada una mira la caja más cercana
 * (`stationView`, función pura del tiempo) y reacciona: el escáner barre con
 * su haz, la selladora se ilumina por dentro y las pantallas cuentan unidades.
 * (El brazo de la línea ahora es el paletizador: AssemblyPalletizer.) Sin estado de React por cuadro.
 */

export const SCAN_X = -3.75;
export const SEAL_X = 2.85;

const SCAN_S = sOnRun(SCAN_X);
const SEAL_S = sOnRun(SEAL_X);

/** 1 cuando la caja está justo en la estación, 0 a más de `reach` de distancia. */
function presence(d: number, reach: number) {
  const x = Math.min(Math.abs(d) / reach, 1);
  return 1 - x * x * (3 - 2 * x);
}

const glowMat = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

/** Baliza de tres luces (roja/ámbar/verde) con estado; propia, no de Kenney. */
export function StackLight({ position, stateRef, scale = 1 }: { position: [number, number, number]; stateRef: React.MutableRefObject<number>; scale?: number }) {
  // stateRef: 0 = verde fijo, 1 = ámbar titilando, 2 = rojo
  const lenses = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#3a0d0a", emissive: "#ff3b2f", emissiveIntensity: 0, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: "#3a2a05", emissive: "#ffb000", emissiveIntensity: 0, roughness: 0.3 }),
      new THREE.MeshStandardMaterial({ color: "#0a2a1a", emissive: "#2bff88", emissiveIntensity: 0, roughness: 0.3 }),
    ],
    []
  );
  useFrame((state) => {
    const s = stateRef.current;
    const blink = Math.sin(state.clock.elapsedTime * 9) > 0 ? 1 : 0.15;
    lenses[0].emissiveIntensity = s === 2 ? 3 : 0.05;
    lenses[1].emissiveIntensity = s === 1 ? 3 * blink : 0.05;
    lenses[2].emissiveIntensity = s === 0 ? 2.4 : 0.05;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#202426" metalness={0.8} roughness={0.4} />
      </mesh>
      {lenses.map((m, i) => (
        <mesh key={i} position={[0, 0.47 + (2 - i) * 0.13, 0]} material={m}>
          <cylinderGeometry args={[0.06, 0.06, 0.12, 16]} />
        </mesh>
      ))}
      <mesh position={[0, 0.83, 0]}>
        <cylinderGeometry args={[0.05, 0.065, 0.04, 16]} />
        <meshStandardMaterial color="#202426" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Pórtico de escaneo (Kenney "scanner-high") con cortina láser y línea que barre. */
function Scanner({ rim }: { rim: string }) {
  const kit = useKit();
  const arch = useMemo(() => kit.piece("scanner-high"), [kit]);
  const sheet = useMemo(() => {
    const m = glowMat(rim, 0.2);
    m.map = shaftTexture();
    return m;
  }, [rim]);
  const lineMat = useMemo(() => glowMat(rim, 0.9), [rim]);
  const lineRef = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const status = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const a = presence(stationView(SCAN_S, t).near, 0.45);
    sheet.opacity = 0.08 + 0.45 * a;
    lineMat.opacity = 0.35 + 0.65 * a;
    if (lineRef.current) lineRef.current.position.y = BELT_TOP + 0.04 + 0.42 * (0.5 + 0.5 * Math.sin(t * (2 + 6 * a)));
    if (light.current) light.current.intensity = 0.3 + 2.2 * a;
    status.current = a > 0.2 ? 1 : 0;
  });

  return (
    <group position={[SCAN_X, 0, RUN_Z]}>
      <primitive object={arch} scale={1.3} />
      {/* cortina: plano vertical que cruza la banda */}
      <mesh position={[0, BELT_TOP + 0.3, 0]} rotation-y={Math.PI / 2} material={sheet} scale={[1, -1, 1]}>
        <planeGeometry args={[BELT_W + 0.2, 0.62]} />
      </mesh>
      <mesh ref={lineRef} material={lineMat}>
        <boxGeometry args={[0.02, 0.012, BELT_W + 0.2]} />
      </mesh>
      <pointLight ref={light} position={[0.3, BELT_TOP + 0.6, 0.5]} color={rim} distance={2.6} decay={2} intensity={0.3} />
      <StackLight position={[0, 1.62, -0.95]} stateRef={status} scale={0.8} />
    </group>
  );
}

/** Selladora (Kenney "machine-window"): la caja entra, adentro se ilumina, sale. */
function Sealer() {
  const kit = useKit();
  const body = useMemo(() => kit.piece("machine-window"), [kit]);
  const inner = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffb347", toneMapped: false }), []);
  const status = useRef(0);
  const sparks = useRef<THREE.Points>(null);
  const sparkData = useMemo(() => {
    const n = 40;
    const seeds = Array.from({ length: n }, (_, i) => [Math.sin(i * 12.9898) * 0.5 + 0.5, Math.sin(i * 78.233) * 0.5 + 0.5, Math.sin(i * 37.719) * 0.5 + 0.5]);
    return { n, seeds, pos: new Float32Array(n * 3) };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const a = presence(stationView(SEAL_S, t).near, 0.7);
    // parpadeo de soldadura mientras hay caja adentro
    const flick = a > 0.3 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 37) * Math.sin(t * 13)) : 0;
    inner.color.setRGB(0.12 + 2.2 * a * flick, 0.08 + 1.3 * a * flick, 0.04 + 0.5 * a * flick);
    status.current = a > 0.3 ? 1 : 0;

    // chispas: caen de la boca de salida mientras se sella
    const p = sparks.current;
    if (!p) return;
    p.visible = a > 0.15;
    if (!p.visible) return;
    const { n, seeds, pos } = sparkData;
    for (let i = 0; i < n; i++) {
      const [s0, s1, s2] = seeds[i];
      const life = (t * (0.9 + s1) + s0) % 1;
      pos[i * 3] = 0.7 + life * (0.25 + 0.5 * s2);
      pos[i * 3 + 1] = BELT_TOP + 0.55 + life * 0.25 - life * life * 1.1;
      pos[i * 3 + 2] = (s2 - 0.5) * 0.8 + (s1 - 0.5) * life * 0.6;
    }
    p.geometry.attributes.position.needsUpdate = true;
    (p.material as THREE.PointsMaterial).opacity = a;
  });

  return (
    <group position={[SEAL_X, 0, RUN_Z]}>
      <primitive object={body} scale={1.2} />
      {/* fondo interior: brilla cuando hay una caja adentro */}
      <mesh position={[0, BELT_TOP + 0.38, -0.5]} material={inner}>
        <planeGeometry args={[1.1, 0.62]} />
      </mesh>
      <StackLight position={[-0.25, 1.56, -0.45]} stateRef={status} scale={0.8} />
      <points ref={sparks} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkData.pos, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffc46b" size={0.035} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
    </group>
  );
}

/** Consola del operador con la pantalla de datos de la línea. */
function Console({ rim, screen }: { rim: string; screen: THREE.Texture }) {
  return (
    <group position={[-5.3, 0, RUN_Z + 1.2]} rotation-y={0.5}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.9, 0.84, 0.5]} />
        <meshStandardMaterial color="#23292c" metalness={0.75} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.06, 0.252]}>
        <boxGeometry args={[0.9, 0.12, 0.01]} />
        <meshStandardMaterial color="#d9a400" metalness={0.3} roughness={0.6} />
      </mesh>
      <group position={[0, 0.9, 0.02]} rotation-x={-0.75}>
        <mesh>
          <boxGeometry args={[0.96, 0.6, 0.06]} />
          <meshStandardMaterial color="#1a1f21" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.032]}>
          <planeGeometry args={[0.84, 0.46]} />
          <meshBasicMaterial map={screen} toneMapped={false} />
        </mesh>
      </group>
      {/* borde de luz de marca bajo la consola */}
      <mesh position={[0, 0.005, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.1, 0.7]} />
        <meshBasicMaterial color={rim} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function AssemblyStations({ rim }: { rim: string }) {
  const screen = useMemo(() => screenTexture(), []);
  const last = useRef(-1);

  // La pantalla se redibuja 4 veces por segundo (dibujar un canvas cuesta).
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const tick = Math.floor(t * 4);
    if (tick === last.current) return;
    last.current = tick;
    const view = stationView(SCAN_S, t);
    screen.draw(rim, 1280 + view.count, Math.abs(view.near) < 1.2, tick);
  });

  return (
    <group>
      <Scanner rim={rim} />
      <Sealer />
      <Console rim={rim} screen={screen.texture} />
    </group>
  );
}
