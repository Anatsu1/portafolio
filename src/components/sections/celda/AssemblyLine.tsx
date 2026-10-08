import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import CellPad from "./CellPad";
import AssemblyConveyor from "./AssemblyConveyor";
import AssemblyStations, { StackLight } from "./AssemblyStations";
import StaticInstances, { type Xform } from "./StaticInstances";
import { useKit } from "./assemblyKit";
import {
  IN_X,
  LINE_BOX_HALF_H,
  OUT_X,
  PATH_LEN,
  TUNNEL_Z,
  WALL_Z,
  pointAt,
  stationView,
  type PathPoint,
} from "./assemblyPath";
import {
  floorTextures,
  glowTexture,
  hazardTexture,
  shaftTexture,
  shutterTexture,
  signTexture,
  wallTexture,
  type Theme,
} from "./assemblyTextures";

/*
 * Entorno "Línea de montaje" (el default, escena principal del portafolio).
 *
 * Una nave industrial en penumbra: piso de hormigón alisado, pared de chapa
 * con dos bocas de carga blindadas (estética "vault"), y una cinta en U detrás
 * del brazo por la que salen, viajan y vuelven a entrar las mismas cajas de
 * carga que levanta el brazo. En el tramo frontal pasan por un escáner, un
 * brazo inspector y una selladora (ver AssemblyStations).
 *
 * Encuadre: la cámara mira hacia abajo, así que de la pared del fondo solo se
 * ve hasta ~2,8 de altura; todo lo interesante vive por debajo de eso. El
 * techo no se ve: su luz llega por el `Environment` (reflejos del brazo de
 * metal oscuro) y por los haces/charcos de luz falsos (planos aditivos).
 *
 * Presupuesto medido: ver docs/plan-brazo-3d.md (bitácora).
 */

const DOOR_W = 1.9;
const DOOR_H = 1.9;
const FRAME_T = 0.3; // espesor del marco blindado
const DOOR_S = WALL_Z - TUNNEL_Z; // distancia recorrida al cruzar la puerta de entrada

const PALETTE = {
  dark: { bg: "#07090a", fogNear: 13, fogFar: 34, pad: "#14181a", tunnelIn: "#ffb04a", lamp: "#ffd9a0" },
  light: { bg: "#bfc7cc", fogNear: 16, fogFar: 48, pad: "#6f777b", tunnelIn: "#ffe2b0", lamp: "#ffffff" },
} as const;

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const steel = new THREE.MeshStandardMaterial({ color: "#262c2f", metalness: 0.85, roughness: 0.45 });

/** Pared del fondo: una sola malla con las dos bocas recortadas. */
function BackWall({ theme }: { theme: Theme }) {
  const map = useMemo(() => {
    const t = wallTexture(theme);
    t.repeat.set(1 / 4, 1 / 4.6); // 4 paneles por textura; el zócalo sucio abajo
    return t;
  }, [theme]);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-20, 0);
    shape.lineTo(20, 0);
    shape.lineTo(20, 9);
    shape.lineTo(-20, 9);
    shape.closePath();
    for (const x of [IN_X, OUT_X]) {
      const hole = new THREE.Path();
      hole.moveTo(x - DOOR_W / 2, 0);
      hole.lineTo(x - DOOR_W / 2, DOOR_H);
      hole.lineTo(x + DOOR_W / 2, DOOR_H);
      hole.lineTo(x + DOOR_W / 2, 0);
      hole.closePath();
      shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <group>
      <mesh geometry={geometry} position={[0, 0, WALL_Z]}>
        <meshStandardMaterial map={map} metalness={0.55} roughness={0.6} />
      </mesh>
      {/* paredes laterales, casi perdidas en la niebla */}
      {[-17, 17].map((x) => (
        <mesh key={x} position={[x, 4.5, WALL_Z + 9]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[22, 9]} />
          <meshStandardMaterial color={theme === "dark" ? "#1b2022" : "#9aa2a6"} metalness={0.5} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Boca de carga blindada: marco con franjas, bulones, persiana a media altura, túnel con luz al fondo. */
function LoadingBay({ x, theme, glow, title, sub, sAtDoor }: { x: number; theme: Theme; glow: string; title: string; sub: string; sAtDoor: number }) {
  const hazV = useMemo(() => hazardTexture(1, 5), []);
  const hazH = useMemo(() => hazardTexture(6, 1), []);
  const shutter = useMemo(() => shutterTexture(theme), [theme]);
  const sign = useMemo(() => signTexture(title, sub), [title, sub]);
  const beacon = useRef<THREE.Group>(null);
  const status = useRef(0);
  const depth = WALL_Z - TUNNEL_Z + 0.8;

  const bolts = useMemo<Xform[]>(() => {
    const out: Xform[] = [];
    const z = WALL_Z + 0.36;
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++) out.push({ p: [x + side * (DOOR_W / 2 + FRAME_T / 2), 0.25 + i * 0.45, z], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) out.push({ p: [x - 0.66 + i * 0.44, DOOR_H + FRAME_T / 2, z], r: [Math.PI / 2, 0, 0] });
    return out;
  }, [x]);
  const boltGeo = useMemo(() => new THREE.CylinderGeometry(0.045, 0.045, 0.05, 6), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const near = stationView(sAtDoor, t).near;
    // Ámbar mientras una caja cruza la boca; verde el resto del tiempo.
    status.current = Math.abs(near) < 0.9 ? 1 : 0;
    if (beacon.current) beacon.current.rotation.y = t * 3.2;
  });

  return (
    <group>
      {/* túnel: caja vista desde adentro, oscura, con luz al fondo */}
      <mesh position={[x, DOOR_H / 2, WALL_Z - depth / 2]}>
        <boxGeometry args={[DOOR_W, DOOR_H, depth]} />
        <meshStandardMaterial color="#0b0d0e" metalness={0.4} roughness={0.8} side={THREE.BackSide} />
      </mesh>
      <mesh position={[x, DOOR_H / 2, WALL_Z - depth + 0.02]}>
        <planeGeometry args={[DOOR_W, DOOR_H]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      {/* marco blindado */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[x + side * (DOOR_W / 2 + FRAME_T / 2), (DOOR_H + FRAME_T) / 2, WALL_Z + 0.16]}>
          <boxGeometry args={[FRAME_T, DOOR_H + FRAME_T, 0.36]} />
          <meshStandardMaterial map={hazV} metalness={0.4} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[x, DOOR_H + FRAME_T / 2, WALL_Z + 0.16]}>
        <boxGeometry args={[DOOR_W, FRAME_T, 0.36]} />
        <meshStandardMaterial map={hazH} metalness={0.4} roughness={0.55} />
      </mesh>
      <StaticInstances geometry={boltGeo} material={steel} items={bolts} />
      {/* persiana levantada a medias */}
      <mesh position={[x, DOOR_H - 0.28, WALL_Z - 0.06]}>
        <planeGeometry args={[DOOR_W, 0.56]} />
        <meshStandardMaterial map={shutter} metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[x, DOOR_H - 0.57, WALL_Z - 0.04]}>
        <boxGeometry args={[DOOR_W, 0.05, 0.08]} />
        <meshStandardMaterial color="#d9a400" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* cartel al costado */}
      <mesh position={[x + (x < 0 ? -1 : 1) * (DOOR_W / 2 + FRAME_T + 0.85), 1.55, WALL_Z + 0.02]}>
        <planeGeometry args={[1.35, 0.42]} />
        <meshStandardMaterial map={sign} metalness={0.3} roughness={0.6} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.25} />
      </mesh>
      <StackLight position={[x + (x < 0 ? 1 : -1) * (DOOR_W / 2 + FRAME_T + 0.12), 1.0, WALL_Z + 0.12]} stateRef={status} />
      {/* baliza giratoria sobre el marco */}
      <group position={[x + (x < 0 ? 1 : -1) * (DOOR_W / 2 - 0.1), DOOR_H + FRAME_T + 0.08, WALL_Z + 0.16]}>
        <mesh>
          <cylinderGeometry args={[0.09, 0.1, 0.16, 16]} />
          <meshStandardMaterial color="#5a3200" emissive="#ff8c00" emissiveIntensity={1.6} transparent opacity={0.9} />
        </mesh>
        <group ref={beacon}>
          <mesh position={[0.35, 0, 0]} rotation-z={Math.PI / 2}>
            <coneGeometry args={[0.16, 0.7, 12, 1, true]} />
            <meshBasicMaterial color="#ff9a1f" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      {/* franjas de peligro en el piso, frente a la boca */}
      <mesh position={[x, 0.006, WALL_Z + 0.75]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[DOOR_W + 1.6, 1.1]} />
        <meshStandardMaterial map={hazH} metalness={0.1} roughness={0.85} transparent opacity={0.8} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

/** Columnas de alma llena contra la pared, con banda de peligro abajo. */
function Columns() {
  const haz = useMemo(() => hazardTexture(2, 2), []);
  const hazMat = useMemo(() => new THREE.MeshStandardMaterial({ map: haz, metalness: 0.4, roughness: 0.55 }), [haz]);
  const xs = [-11.5, -8.3, -2.6, 2.6, 8.3, 11.5];
  const z = WALL_Z + 0.3;
  const beams = useMemo<Xform[]>(
    () =>
      xs.flatMap((x) => [
        { p: [x, 4.5, z - 0.12], s: [0.5, 9, 0.06] }, // ala trasera
        { p: [x, 4.5, z + 0.18], s: [0.5, 9, 0.06] }, // ala delantera
        { p: [x, 4.5, z + 0.03], s: [0.06, 9, 0.3] }, // alma
        { p: [x, 0.08, z + 0.03], s: [0.7, 0.16, 0.6] }, // placa base
      ]),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const bands = useMemo<Xform[]>(() => xs.map((x) => ({ p: [x, 0.62, z + 0.03], s: [0.54, 0.9, 0.38] })), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <StaticInstances geometry={unitBox} material={steel} items={beams} />
      <StaticInstances geometry={unitBox} material={hazMat} items={bands} />
    </>
  );
}

/** Cañerías horizontales sobre la pared, con bridas, soportes y válvulas (Kenney). */
function Pipes() {
  const kit = useKit();
  const pipeGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2), []);
  const flangeGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 16).rotateZ(Math.PI / 2), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6e2620", metalness: 0.6, roughness: 0.5 }), []);
  const runs = [
    { y: 2.62, r: 0.13, z: WALL_Z + 0.32, mat: steel },
    { y: 2.34, r: 0.08, z: WALL_Z + 0.5, mat: red },
  ];
  const flanges = useMemo<Xform[]>(
    () => runs.flatMap((run) => Array.from({ length: 14 }, (_, i) => ({ p: [-16 + i * 2.4, run.y, run.z] as [number, number, number], s: [0.06, run.r * 1.35, run.r * 1.35] as [number, number, number] }))),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const valves = useMemo(() => [kit.piece("pipe-large-valve"), kit.piece("pipe-large-valve")], [kit]);
  return (
    <group>
      {runs.map((run) => (
        <mesh key={run.y} geometry={pipeGeo} material={run.mat} position={[0, run.y, run.z]} scale={[36, run.r, run.r]} />
      ))}
      <StaticInstances geometry={flangeGeo} material={steel} items={flanges} />
      {/* válvulas de Kenney intercaladas en la cañería gruesa */}
      <primitive object={valves[0]} position={[-3.6, 2.62 - 0.13, WALL_Z + 0.32]} rotation-y={Math.PI / 2} scale={0.27} />
      <primitive object={valves[1]} position={[3.9, 2.62 - 0.13, WALL_Z + 0.32]} rotation-y={Math.PI / 2} scale={0.27} />
    </group>
  );
}

/** Franjas pintadas en el piso que acompañan la U (pasillo peatonal). */
function FloorLines({ rim, theme }: { rim: string; theme: Theme }) {
  const make = (offset: number, width: number) => {
    const pts: number[] = [];
    const idx: number[] = [];
    const p: PathPoint = { x: 0, z: 0, yaw: 0 };
    const from = DOOR_S + 0.9;
    const to = PATH_LEN - DOOR_S - 0.9;
    const n = Math.ceil((to - from) / 0.15);
    for (let i = 0; i <= n; i++) {
      pointAt(from + ((to - from) * i) / n, p);
      const nx = Math.sin(p.yaw);
      const nz = Math.cos(p.yaw);
      for (const e of [-width / 2, width / 2]) pts.push(p.x + nx * (offset + e), 0, p.z + nz * (offset + e));
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const lines = useMemo(() => [make(1.45, 0.09), make(-1.45, 0.09)], []); // eslint-disable-line react-hooks/exhaustive-deps
  const led = useMemo(() => make(1.25, 0.025), []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[0, 0.004, 0]}>
      {lines.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#d9a400" metalness={0.1} roughness={0.75} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ))}
      {/* tira de luz del color de marca, del lado del brazo */}
      <mesh geometry={led} position={[0, 0.002, 0]}>
        <meshBasicMaterial color={rim} toneMapped={false} transparent opacity={theme === "dark" ? 0.9 : 0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Charcos de luz de las lámparas (oscuro) o de las claraboyas (claro), y haces. */
function LightPools({ theme }: { theme: Theme }) {
  const glow = useMemo(() => glowTexture(), []);
  const shaft = useMemo(() => shaftTexture(), []);
  const dark = theme === "dark";
  const pools: [number, number, number][] = dark
    ? [[-3.2, -6.2, 3.4], [0.2, -7.2, 3.8], [3.4, -6.2, 3.4], [-7.6, -7.6, 3], [7.6, -7.4, 3]]
    : [[-2.4, -6.4, 4.4], [3.2, -6.8, 4.4], [-7.2, -6, 4]];
  return (
    <group>
      {pools.map(([x, z, s]) => (
        <mesh key={`${x}${z}`} position={[x, 0.008, z]} rotation-x={-Math.PI / 2} scale={dark ? [s, s, 1] : [s * 0.7, s * 1.3, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={glow} color={dark ? "#ffb966" : "#fff6e0"} transparent opacity={dark ? 0.16 : 0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {/* haces: planos cruzados que bajan desde el techo */}
      {pools.slice(0, 3).map(([x, z]) =>
        [0, Math.PI / 2].map((ry) => (
          <mesh key={`${x}${z}${ry}`} position={[x + (dark ? 0 : 0.9), 3.2, z + (dark ? 0 : -0.4)]} rotation={[0, ry, dark ? 0 : 0.28]}>
            <planeGeometry args={[dark ? 1.6 : 2.4, 6.4]} />
            <meshBasicMaterial map={shaft} color={dark ? "#ffcf8a" : "#ffffff"} transparent opacity={dark ? 0.05 : 0.09} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Pallets con cajas de carga esperando, junto a las bocas. */
function usePallets() {
  return useMemo(() => {
    const y0 = 0.14 + LINE_BOX_HALF_H;
    const s = 0.235;
    const stack = (x: number, z: number, ry: number): Xform[] => [
      { p: [x - 0.27, y0, z], r: [0, ry, 0], s },
      { p: [x + 0.27, y0, z + 0.04], r: [0, ry + 0.08, 0], s },
      { p: [x - 0.02, y0 + LINE_BOX_HALF_H * 2 + 0.01, z + 0.02], r: [0, ry - 0.12, 0], s },
    ];
    return { boxes: [...stack(-8.0, -8.3, 0.1), ...stack(7.9, -8.2, -0.15)], pallets: [[-8.0, -8.3], [7.9, -8.2]] as [number, number][] };
  }, []);
}

export default function AssemblyLine({ theme, rim }: { theme: Theme; rim: string }) {
  const pal = PALETTE[theme];
  const dark = theme === "dark";
  const floor = useMemo(() => floorTextures(theme), [theme]);
  const pallets = usePallets();

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.bg, pal.fogNear, pal.fogFar]} />

      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial map={floor.map} roughnessMap={floor.roughnessMap} metalness={dark ? 0.12 : 0.05} roughness={1} envMapIntensity={dark ? 0.35 : 0.5} />
      </mesh>
      <FloorLines rim={rim} theme={theme} />
      <LightPools theme={theme} />

      <BackWall theme={theme} />
      <Columns />
      <Pipes />
      <LoadingBay x={IN_X} theme={theme} glow={pal.tunnelIn} title="ENTRADA" sub="LINEA 01 · BOCA A" sAtDoor={DOOR_S} />
      <LoadingBay x={OUT_X} theme={theme} glow={rim} title="DESPACHO" sub="LINEA 01 · BOCA B" sAtDoor={PATH_LEN - DOOR_S} />

      {pallets.pallets.map(([x, z]) => (
        <mesh key={x} position={[x, 0.07, z]}>
          <boxGeometry args={[1.15, 0.14, 0.9]} />
          <meshStandardMaterial color={dark ? "#3a2f24" : "#6b5843"} roughness={0.85} />
        </mesh>
      ))}

      <AssemblyConveyor pallets={pallets.boxes} />
      <AssemblyStations rim={rim} />

      <CellPad color={pal.pad} ring={rim} />

      {/* Luces reales: pocas (cada una cuesta en todos los materiales) */}
      <hemisphereLight args={dark ? ["#3a4348", "#0a0b0c", 0.55] : ["#f4f7f9", "#7d8285", 1.0]} />
      <directionalLight position={[4, 7, 5]} intensity={dark ? 1.25 : 1.6} color={dark ? "#ffe9cc" : "#ffffff"} />
      <directionalLight position={[-5, 3, -4]} intensity={dark ? 0.3 : 0.25} color={rim} />
      {dark ? (
        <>
          <pointLight position={[-3.2, 3.2, -6.2]} intensity={9} distance={9} decay={2} color={pal.lamp} />
          <pointLight position={[3.4, 3.2, -6.2]} intensity={9} distance={9} decay={2} color={pal.lamp} />
        </>
      ) : (
        <directionalLight position={[-3, 9, -2]} intensity={1.6} color="#fff3dc" />
      )}

      <Environment resolution={256} key={`linea-env-${theme}-${rim}`}>
        {/* techo: paneles de luz (lo que refleja el lomo del brazo) */}
        <Lightformer form="rect" intensity={dark ? 2.2 : 4} position={[0, 7, -1]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} color={dark ? "#ffe6c4" : "#ffffff"} />
        <Lightformer form="rect" intensity={dark ? 1.2 : 2.5} position={[0, 6, 6]} rotation-x={Math.PI / 2.4} scale={[10, 2, 1]} />
        {/* tiras laterales: definen el contorno de los segmentos */}
        <Lightformer form="rect" intensity={dark ? 1.7 : 2.4} position={[7, 2.5, 4]} rotation-y={-Math.PI / 2.4} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={dark ? 1.1 : 2} position={[-7, 2.5, 3]} rotation-y={Math.PI / 2.4} scale={[8, 3, 1]} />
        {/* fondo cálido (bocas de carga) y aro del color de marca */}
        <Lightformer form="rect" intensity={dark ? 1.4 : 1.6} position={[0, 1.4, -9]} scale={[16, 1.4, 1]} color={dark ? "#ffb04a" : "#fff1d6"} />
        <Lightformer form="ring" intensity={dark ? 2.4 : 1.4} color={rim} position={[-4, 3, -6]} scale={6} />
      </Environment>
    </>
  );
}
