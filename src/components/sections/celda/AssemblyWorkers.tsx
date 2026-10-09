import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { lathe, mat } from "./robotMetal";
import type { Theme } from "./assemblyTextures";

/*
 * Operarios de la línea: figuras low-poly propias (no se descargó nada), con
 * casco, anteojos de seguridad, chaleco reflectante y botines. Cada una es UNA
 * malla con esqueleto (SkinnedMesh): cada pieza va pegada a un solo hueso
 * (peso 1), así que se arma sumando tornos/cajas ya ubicados en la pose de
 * reposo y se anima rotando huesos — un draw call por persona, ~3k triángulos.
 *
 * Las franjas del chaleco y del pantalón llevan un atributo `glow`: el
 * material las suma a la emisión (en el tema oscuro "devuelven" la luz como
 * una cinta reflectante de verdad).
 *
 * Animación procedural, función del tiempo: caminar (fase según la distancia
 * recorrida, para que los pies no patinen), respirar, mirar, usar la tableta.
 */

const BONES = [
  "hips", "spine", "chest", "neck", "head",
  "shoulderL", "armL", "foreL", "handL",
  "shoulderR", "armR", "foreR", "handR",
  "thighL", "shinL", "footL",
  "thighR", "shinR", "footR",
] as const;
type BoneName = (typeof BONES)[number];
const PARENT: Record<BoneName, BoneName | null> = {
  hips: null, spine: "hips", chest: "spine", neck: "chest", head: "neck",
  shoulderL: "chest", armL: "shoulderL", foreL: "armL", handL: "foreL",
  shoulderR: "chest", armR: "shoulderR", foreR: "armR", handR: "foreR",
  thighL: "hips", shinL: "thighL", footL: "shinL",
  thighR: "hips", shinR: "thighR", footR: "shinR",
};
/** Posición de cada articulación en reposo (de pie, mirando a +Z, brazos abajo). */
const REST: Record<BoneName, [number, number, number]> = {
  hips: [0, 0.95, 0], spine: [0, 1.06, 0], chest: [0, 1.28, 0], neck: [0, 1.5, 0], head: [0, 1.58, 0],
  shoulderL: [0.17, 1.44, 0], armL: [0.2, 1.43, 0], foreL: [0.215, 1.15, 0], handL: [0.225, 0.9, 0.01],
  shoulderR: [-0.17, 1.44, 0], armR: [-0.2, 1.43, 0], foreR: [-0.215, 1.15, 0], handR: [-0.225, 0.9, 0.01],
  thighL: [0.095, 0.9, 0], shinL: [0.1, 0.49, 0], footL: [0.1, 0.08, 0],
  thighR: [-0.095, 0.9, 0], shinR: [-0.1, 0.49, 0], footR: [-0.1, 0.08, 0],
};

export type WorkerLook = { vest: string; helmet: string; skin: string; pants: string; shirt: string; tablet: boolean };

/** Pieza rígida: geometría ya ubicada en reposo, color, hueso y brillo. */
function piece(list: THREE.BufferGeometry[], g: THREE.BufferGeometry, m: THREE.Matrix4, color: string, bone: BoneName, glow = 0) {
  const geo = (g.index ? g.toNonIndexed() : g).applyMatrix4(m);
  if (g.index) g.dispose();
  for (const n of Object.keys(geo.attributes)) if (n !== "position" && n !== "normal") geo.deleteAttribute(n);
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  const count = geo.getAttribute("position").count;
  const c = new THREE.Color(color);
  const col = new Float32Array(count * 3);
  const idx = new Uint16Array(count * 4);
  const w = new Float32Array(count * 4);
  const gl = new Float32Array(count).fill(glow);
  const b = BONES.indexOf(bone);
  for (let i = 0; i < count; i++) {
    c.toArray(col, i * 3);
    idx[i * 4] = b;
    w[i * 4] = 1;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(idx, 4));
  geo.setAttribute("skinWeight", new THREE.BufferAttribute(w, 4));
  geo.setAttribute("glow", new THREE.BufferAttribute(gl, 1));
  list.push(geo);
}

/** Tramo de miembro: torno entre dos alturas (de arriba hacia abajo en reposo), elíptico con `sz`. */
function limb(r0: number, r1: number, len: number, seg = 10) {
  // perfil antihorario: abajo (y = −len) hacia afuera, costado hacia arriba, arriba hacia adentro
  return lathe([[0, -len], [r1 * 0.8, -len], [r1, -len + 0.02], [r0, -0.02], [r0 * 0.8, 0], [0, 0]], seg);
}
function ball(r: number, seg = 10) {
  const prof: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    prof.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  prof[0][0] = 0;
  prof[8][0] = 0;
  return lathe(prof, seg);
}
function band(r: number, y0: number, y1: number, seg = 12) {
  return lathe([[r, y0], [r, y1]], seg);
}

function buildWorker(look: WorkerLook) {
  const L: THREE.BufferGeometry[] = [];
  const R = REST;
  const at = (b: BoneName, dx = 0, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0, s = 1) => mat(R[b][0] + dx, R[b][1] + dy, R[b][2] + dz, rx, ry, rz, s);
  const scaled = (m: THREE.Matrix4, sx: number, sy: number, sz: number) => m.multiply(new THREE.Matrix4().makeScale(sx, sy, sz));
  const BOOT = "#2a2421";
  const GLOVE = "#3b3d3f";

  // Piernas
  for (const s of ["L", "R"] as const) {
    const thigh = `thigh${s}` as BoneName;
    const shin = `shin${s}` as BoneName;
    const foot = `foot${s}` as BoneName;
    piece(L, limb(0.095, 0.072, 0.41), at(thigh), look.pants, thigh);
    piece(L, ball(0.072), at(shin), look.pants, shin);
    piece(L, limb(0.07, 0.056, 0.4), at(shin), look.pants, shin);
    piece(L, band(0.068, -0.24, -0.205), at(shin), "#d8dcdc", shin, 1);
    // botín
    piece(L, new THREE.BoxGeometry(0.11, 0.09, 0.26, 1, 1, 1), at(foot, 0, -0.035, 0.05), BOOT, foot);
    piece(L, limb(0.058, 0.06, 0.08, 8), at(foot, 0, 0.04, 0), BOOT, foot);
  }
  // Cadera y torso
  piece(L, ball(0.12, 12), scaled(at("hips", 0, 0.0), 1.35, 0.9, 0.95), look.pants, "hips");
  piece(L, band(0.155, -0.02, 0.03, 12), scaled(at("hips", 0, 0.05), 1.0, 1, 0.72), "#1d1e1f", "hips"); // cinturón
  piece(L, lathe([[0, 0], [0.14, 0], [0.15, 0.05], [0.16, 0.22], [0, 0.22]], 12), scaled(at("spine"), 1.05, 1, 0.68), look.shirt, "spine");
  piece(L, lathe([[0, 0], [0.16, 0], [0.175, 0.1], [0.17, 0.18], [0.12, 0.23], [0, 0.23]], 12), scaled(at("chest"), 1.08, 1, 0.68), look.shirt, "chest");
  // Chaleco (más grande que el torso) y sus franjas reflectantes
  piece(L, lathe([[0, -0.0], [0.165, -0.0], [0.168, 0.05], [0.172, 0.22], [0, 0.22]], 12), scaled(at("spine", 0, 0.02), 1.06, 1, 0.71), look.vest, "spine");
  piece(L, lathe([[0, 0], [0.174, 0], [0.188, 0.1], [0.182, 0.17], [0.14, 0.205], [0, 0.205]], 12), scaled(at("chest"), 1.08, 1, 0.71), look.vest, "chest");
  piece(L, band(0.176, 0.13, 0.165, 14), scaled(at("spine"), 1.07, 1, 0.72), "#e4e7e8", "spine", 1);
  piece(L, band(0.191, 0.04, 0.075, 14), scaled(at("chest"), 1.08, 1, 0.72), "#e4e7e8", "chest", 1);
  // Cuello, cabeza, anteojos, casco
  piece(L, limb(0.05, 0.055, 0.09, 8), at("neck", 0, 0.08), look.skin, "neck");
  piece(L, ball(0.1, 12), scaled(at("head", 0, 0.1, 0.01), 0.92, 1.12, 1), look.skin, "head");
  piece(L, band(0.098, 0.105, 0.135, 14), scaled(at("head", 0, 0.0, 0.012), 0.95, 1, 1.02), "#121416", "head");
  piece(L, lathe([[0, 0], [0.135, 0], [0.135, 0.008], [0.116, 0.012], [0.117, 0.05], [0.1, 0.1], [0.06, 0.125], [0, 0.13]], 14), scaled(at("head", 0, 0.15, 0.0), 0.95, 1, 1.08), look.helmet, "head");
  piece(L, new THREE.BoxGeometry(0.03, 0.02, 0.2), at("head", 0, 0.28, 0.0), look.helmet, "head");
  // Brazos
  for (const s of ["L", "R"] as const) {
    const arm = `arm${s}` as BoneName;
    const fore = `fore${s}` as BoneName;
    const hand = `hand${s}` as BoneName;
    piece(L, ball(0.068), scaled(at(arm), 1, 0.9, 0.9), look.vest, arm);
    piece(L, limb(0.055, 0.046, 0.28), at(arm), look.shirt, arm);
    piece(L, ball(0.046), at(fore), look.shirt, fore);
    piece(L, limb(0.046, 0.036, 0.24), at(fore), look.shirt, fore);
    piece(L, band(0.048, -0.1, -0.07), at(fore), "#d8dcdc", fore, 0.6);
    piece(L, new THREE.BoxGeometry(0.06, 0.1, 0.09), at(hand, 0, -0.05, 0.005), GLOVE, hand);
  }
  // Tableta en la mano izquierda (la sostiene delante con el antebrazo doblado).
  if (look.tablet) {
    piece(L, new THREE.BoxGeometry(0.2, 0.014, 0.15), at("handL", -0.06, -0.08, 0.06), "#1b1d1f", "handL");
    piece(L, new THREE.PlaneGeometry(0.17, 0.12).rotateX(-Math.PI / 2), at("handL", -0.06, -0.072, 0.06), "#5fd7ff", "handL", 1.4);
  }
  const geo = mergeGeometries(L, false)!;
  L.forEach((g) => g.dispose());
  geo.computeBoundingSphere();
  return geo;
}

// ------------------------------------------------------------- material --

const glowUniform = { value: 0.8 };
let workerMat: THREE.MeshStandardMaterial | null = null;
function workerMaterial() {
  if (workerMat) return workerMat;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.02 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.glowStrength = glowUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float glow;\nvarying float vGlow;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlow = glow;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float glowStrength;\nvarying float vGlow;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * glowStrength;");
  };
  m.customProgramCacheKey = () => "worker-glow";
  workerMat = m;
  return m;
}

// ------------------------------------------------------------ esqueleto --

type Rig = { mesh: THREE.SkinnedMesh; bones: Record<BoneName, THREE.Bone> };

function makeRig(look: WorkerLook): Rig {
  const geo = buildWorker(look);
  const bones = {} as Record<BoneName, THREE.Bone>;
  for (const n of BONES) {
    const b = new THREE.Bone();
    b.name = n;
    bones[n] = b;
  }
  for (const n of BONES) {
    const p = PARENT[n];
    const [x, y, z] = REST[n];
    if (p) {
      const [px, py, pz] = REST[p];
      bones[n].position.set(x - px, y - py, z - pz);
      bones[p].add(bones[n]);
    } else bones[n].position.set(x, y, z);
  }
  const mesh = new THREE.SkinnedMesh(geo, workerMaterial());
  mesh.add(bones.hips);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(BONES.map((n) => bones[n])));
  mesh.frustumCulled = false;
  return { mesh, bones };
}

/** Pone la pose base (todo en cero) antes de aplicar la del cuadro. */
function resetPose(b: Record<BoneName, THREE.Bone>) {
  for (const n of BONES) b[n].rotation.set(0, 0, 0);
  b.hips.position.set(...REST.hips);
}

/** Ciclo de caminata: `phase` en radianes (un paso = π). */
function walkPose(b: Record<BoneName, THREE.Bone>, phase: number, amount: number, tablet: boolean) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  b.thighL.rotation.x = -0.42 * s * amount;
  b.thighR.rotation.x = 0.42 * s * amount;
  b.shinL.rotation.x = (0.15 + 0.55 * Math.max(0, -c)) * amount;
  b.shinR.rotation.x = (0.15 + 0.55 * Math.max(0, c)) * amount;
  b.footL.rotation.x = 0.2 * s * amount;
  b.footR.rotation.x = -0.2 * s * amount;
  b.hips.position.y = REST.hips[1] - 0.025 * amount + 0.02 * Math.abs(c) * amount;
  b.hips.rotation.y = 0.08 * s * amount;
  b.chest.rotation.y = -0.12 * s * amount;
  b.armR.rotation.x = -0.35 * s * amount;
  b.foreR.rotation.x = -0.25 * amount;
  if (!tablet) {
    b.armL.rotation.x = 0.35 * s * amount;
    b.foreL.rotation.x = -0.25 * amount;
  }
}

/** Sostener la tableta delante del pecho y mirarla. */
function tabletPose(b: Record<BoneName, THREE.Bone>, look: number) {
  b.armL.rotation.x = -0.35;
  b.armL.rotation.z = -0.1;
  b.foreL.rotation.x = -1.25;
  b.handL.rotation.x = 0.2;
  b.head.rotation.x = 0.35 * look;
  b.neck.rotation.x = 0.1 * look;
}

/** Respiración y balanceo de peso (siempre, leve). */
function idle(b: Record<BoneName, THREE.Bone>, t: number, seed: number) {
  b.chest.rotation.x += 0.02 * Math.sin(t * 1.6 + seed);
  b.hips.rotation.z += 0.025 * Math.sin(t * 0.35 + seed);
  b.spine.rotation.z -= 0.02 * Math.sin(t * 0.35 + seed);
  b.armL.rotation.z += 0.04;
  b.armR.rotation.z -= 0.04;
}

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};

// ------------------------------------------------------------ componentes --

export type WorkerKind = "driver" | "console" | "walker" | "inspector";

const LOOKS: Record<WorkerKind, Omit<WorkerLook, "vest" | "helmet">> = {
  driver: { skin: "#a87a5c", pants: "#23283a", shirt: "#2f3336", tablet: false },
  console: { skin: "#c39274", pants: "#262b38", shirt: "#33373a", tablet: false },
  walker: { skin: "#8d6248", pants: "#2a2f3b", shirt: "#3a3e41", tablet: true },
  inspector: { skin: "#b78462", pants: "#2c2a26", shirt: "#2e3235", tablet: true },
};

/**
 * Un operario. `kind` elige la animación:
 *  - driver: sentado (va dentro del autoelevador), mira alrededor;
 *  - console: de pie frente a la consola, con las manos en el panel;
 *  - walker: recorre la senda peatonal ida y vuelta, se detiene a mirar;
 *  - inspector: revisa la selladora con la tableta.
 */
export function Worker({ kind, position, rotationY = 0, vest, helmet }: { kind: WorkerKind; position: [number, number, number]; rotationY?: number; vest: string; helmet: string }) {
  const rig = useMemo(() => makeRig({ ...LOOKS[kind], vest, helmet }), [kind, vest, helmet]);
  useEffect(() => () => rig.mesh.geometry.dispose(), [rig]);
  const root = useRef<THREE.Group>(null);
  const seed = useMemo(() => kind.length * 1.7, [kind]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = rig.bones;
    resetPose(b);
    if (kind === "driver") {
      b.hips.position.y = REST.hips[1];
      b.thighL.rotation.x = b.thighR.rotation.x = -1.45;
      b.shinL.rotation.x = b.shinR.rotation.x = 1.35;
      b.thighL.rotation.z = 0.08;
      b.thighR.rotation.z = -0.08;
      b.armL.rotation.x = b.armR.rotation.x = -0.75;
      b.foreL.rotation.x = b.foreR.rotation.x = -0.75;
      b.armL.rotation.z = 0.12;
      b.armR.rotation.z = -0.12;
      b.head.rotation.y = 0.6 * Math.sin(t * 0.4 + 1) * Math.sin(t * 0.13);
      b.chest.rotation.x = 0.05 * Math.sin(t * 1.6);
    } else if (kind === "console") {
      // Manos sobre el panel; cada tanto teclea y cada tanto mira la cinta.
      b.armL.rotation.x = b.armR.rotation.x = -0.55;
      b.foreL.rotation.x = b.foreR.rotation.x = -0.7;
      b.armL.rotation.z = -0.15;
      b.armR.rotation.z = 0.15;
      const tap = Math.max(0, Math.sin(t * 9)) * smooth(Math.sin(t * 0.7) * 2);
      b.foreR.rotation.x -= 0.12 * tap;
      b.handR.rotation.x = 0.3 * tap;
      const glance = smooth((Math.sin(t * 0.21 + 2) - 0.6) * 4);
      b.head.rotation.x = 0.35 * (1 - glance);
      b.head.rotation.y = -0.9 * glance;
      b.chest.rotation.y = -0.2 * glance;
      b.spine.rotation.x = 0.08;
    } else if (kind === "inspector") {
      tabletPose(b, 1);
      // Mira la máquina, anota, y cada tanto señala con la mano derecha.
      const up = smooth((Math.sin(t * 0.33 + 0.5) - 0.3) * 3);
      b.head.rotation.x = 0.35 * (1 - up) - 0.05 * up;
      b.head.rotation.y = 0.25 * up;
      const point = smooth((Math.sin(t * 0.17 + 4) - 0.75) * 6);
      b.armR.rotation.x = -1.2 * point - 0.1;
      b.armR.rotation.z = 0.25 * point;
      b.foreR.rotation.x = -0.3 * point - 0.15;
      b.foreR.rotation.x -= 0.4 * Math.max(0, Math.sin(t * 7)) * (1 - point) * up;
    }
    if (kind === "walker" && root.current) walkerFrame(t, b, root.current);
    idle(b, t, seed);
  });

  return (
    <group ref={root} position={position} rotation-y={rotationY}>
      <primitive object={rig.mesh} />
    </group>
  );
}

/*
 * Recorrido del caminante: senda peatonal junto a la pata de entrada
 * (x = LANE_X), entre la pila de pallets del fondo y la consola.
 */
const LANE_X = -6.75;
const WALK = { z0: -8.3, z1: -3.1, speed: 1.05 };
const LEG = (WALK.z1 - WALK.z0) / WALK.speed;
const STOP_A = 5.0; // mirando la línea (gira hacia +X)
const STOP_B = 4.0; // revisando los pallets del fondo (gira hacia −X)
const TURN = 1.2;
const PERIOD = LEG + TURN + STOP_A + TURN + LEG + TURN + STOP_B + TURN;

function walkerFrame(time: number, b: Record<BoneName, THREE.Bone>, root: THREE.Group) {
  let t = time % PERIOD;
  let z = WALK.z0;
  let yaw = 0;
  let walking = 0;
  let dist = 0;
  let look = 0;
  const seg = (d: number) => {
    const r = t < d;
    if (!r) t -= d;
    return r;
  };
  if (seg(LEG)) {
    dist = t * WALK.speed;
    z = WALK.z0 + dist;
    walking = 1;
  } else if (seg(TURN)) {
    z = WALK.z1;
    yaw = (Math.PI / 2) * smooth(t / TURN);
  } else if (seg(STOP_A)) {
    z = WALK.z1;
    yaw = Math.PI / 2;
    look = smooth(t / 0.8) * (1 - smooth((t - STOP_A + 0.8) / 0.8));
  } else if (seg(TURN)) {
    z = WALK.z1;
    yaw = Math.PI / 2 + (Math.PI / 2) * smooth(t / TURN);
  } else if (seg(LEG)) {
    dist = t * WALK.speed;
    z = WALK.z1 - dist;
    yaw = Math.PI;
    walking = 1;
  } else if (seg(TURN)) {
    z = WALK.z0;
    yaw = Math.PI + (Math.PI / 2) * smooth(t / TURN);
  } else if (seg(STOP_B)) {
    z = WALK.z0;
    yaw = (Math.PI * 3) / 2;
    look = 0.6;
  } else {
    z = WALK.z0;
    yaw = (Math.PI * 3) / 2 + (Math.PI / 2) * smooth(t / TURN);
  }
  root.position.set(LANE_X, 0, z);
  root.rotation.y = yaw;
  // Fase de la caminata según la distancia: un paso cada 0,68 (sin patinar).
  const phase = (dist / 0.68) * Math.PI;
  // Arranque y frenada suaves (las piernas se cierran al parar).
  const amount = walking ? Math.min(1, dist / 0.4, (WALK.z1 - WALK.z0 - dist) / 0.4 + 0.15) : 0;
  walkPose(b, phase, amount, true);
  tabletPose(b, 0.35 + 0.65 * look);
  if (walking) b.head.rotation.x = 0.1;
  b.head.rotation.y = walking ? 0.3 * Math.sin(time * 0.5) : 0;
}

/** Los tres operarios a pie de la línea (el cuarto maneja el autoelevador). */
export default function AssemblyWorkers({ theme }: { theme: Theme }) {
  glowUniform.value = theme === "dark" ? 0.9 : 0.15;
  return (
    <group>
      {/* operador al costado de la consola (consola en (−5,3; −3,9) girada 0,5): no tapa la pantalla */}
      <Worker kind="console" position={[-4.35, 0, -4.1]} rotationY={-1.35} vest="#d9a400" helmet="#e9ecee" />
      <Worker kind="walker" position={[LANE_X, 0, WALK.z0]} vest="#e8731a" helmet="#d9a400" />
      {/* técnico revisando la selladora, detrás de la cinta */}
      <Worker kind="inspector" position={[4.0, 0, -6.9]} rotationY={-0.58} vest="#e8731a" helmet="#e9ecee" />
    </group>
  );
}

