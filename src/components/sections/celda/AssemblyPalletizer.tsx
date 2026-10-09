import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { StackLight } from "./AssemblyStations";
import { LINE_BOX_FAR_URL } from "./assemblyKit";
import { BELT_TOP, BELT_W, LINE_BOX_HALF_H, LINE_BOX_SCALE, PICK_X, RUN_Z, WALL_Z } from "./assemblyPath";
import {
  ARM,
  BOX_TOP_ABOVE_ORIGIN,
  CARRY_Y,
  FORK_DOOR_X,
  PALLET_POS,
  PICK_TOP_Y,
  ROBOT_POS,
  armEvent,
  newStationState,
  slotOffset,
  slotYaw,
  stationAt,
  stopperDown,
  type ArmEvent,
} from "./assemblyPallet";
import {
  ARM_H0,
  ARM_L1,
  ARM_L2,
  TOOL_L,
  buildCabinet,
  buildForklift,
  buildPalBase,
  buildPalForearm,
  buildPalletGeometry,
  buildPalTool,
  buildPalTurret,
  buildPalUpperArm,
  buildPalWrist,
} from "./assemblyPalletizerGeometry";
import { robotMaterials } from "./robotMetal";
import { Worker } from "./AssemblyWorkers";

/*
 * Estación de paletizado: el brazo toma las cajas desviadas en el tope de la
 * cinta y las apila en el pallet; cuando el pallet se llena, el autoelevador
 * sale por la puerta C, se lo lleva y trae uno vacío. Toda la coreografía sale
 * de assemblyPallet.ts (funciones puras del tiempo); acá solo se ubican las
 * piezas en cada cuadro, sin estado de React.
 *
 * Cinemática del brazo: giro de la base (yaw) + dos eslabones planos
 * (hombro, codo) resueltos con la ley de cosenos, "codo arriba"; la muñeca
 * compensa para que las ventosas miren siempre al piso, y la herramienta gira
 * en Y para alinearse con la caja. Los ejes de las piezas están en
 * assemblyPalletizerGeometry.ts.
 */

const TURRET_Y = 0.5;
const PALLET_SLOTS = 8; // instancias de pallet: estación, autoelevador, quietos
const BOX_SLOTS = 26;

/** Pallets quietos con cajas (junto a las bocas) y pila de pallets vacíos junto a la puerta. */
const STATIC_PALLETS: { x: number; z: number; ry: number; boxes: number }[] = [
  { x: -8.0, z: -8.3, ry: 0.06, boxes: 3 },
  { x: 7.9, z: -8.2, ry: -0.1, boxes: 3 },
];
const EMPTY_STACK = { x: 3.6, z: -8.95, n: 3 };

const smooth = (x: number) => {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
};
const span = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

type Pose = { x: number; y: number; z: number; yaw: number };

/** Polares alrededor del pie del brazo (para trasladar girando, no en línea recta). */
function toPolar(x: number, z: number) {
  const dx = x - ROBOT_POS.x;
  const dz = z - ROBOT_POS.z;
  return { phi: Math.atan2(-dz, dx), r: Math.hypot(dx, dz) };
}

function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Punto de la herramienta (tapa de la caja) según el ciclo. */
function toolPose(ev: ArmEvent, out: Pose) {
  const home = { x: PICK_X, z: RUN_Z };
  if (ev.n < 0) {
    out.x = home.x;
    out.z = home.z;
    out.y = CARRY_Y;
    out.yaw = 0;
    return out;
  }
  const [sx, sy, sz] = slotOffset(ev.slot);
  const slot = { x: PALLET_POS.x + sx, z: PALLET_POS.z + sz, y: sy + BOX_TOP_ABOVE_ORIGIN };
  // La herramienta gira lo necesario para que la caja quede como pide el lugar.
  const sYaw = slotYaw(ev.slot) - ev.flip;
  const t = ev.tau;
  // Tramo de traslado en polares (gira alrededor del pie).
  const travel = (from: { x: number; z: number }, to: { x: number; z: number }, k: number) => {
    const a = toPolar(from.x, from.z);
    const b = toPolar(to.x, to.z);
    const phi = lerpAngle(a.phi, b.phi, k);
    const r = a.r + (b.r - a.r) * k;
    out.x = ROBOT_POS.x + Math.cos(phi) * r;
    out.z = ROBOT_POS.z - Math.sin(phi) * r;
  };
  if (t < ARM.up) {
    out.x = home.x;
    out.z = home.z;
    out.y = t < ARM.grip ? CARRY_Y + (PICK_TOP_Y - CARRY_Y) * span(t, 0, ARM.down) : PICK_TOP_Y + (CARRY_Y - PICK_TOP_Y) * span(t, ARM.grip, ARM.up);
    out.yaw = ev.yaw * span(t, 0, ARM.down);
  } else if (t < ARM.over) {
    const k = span(t, ARM.up, ARM.over);
    travel(home, slot, k);
    out.y = CARRY_Y;
    out.yaw = ev.yaw + (sYaw - ev.yaw) * k;
  } else if (t < ARM.clear) {
    out.x = slot.x;
    out.z = slot.z;
    out.y = t < ARM.place ? CARRY_Y + (slot.y - CARRY_Y) * span(t, ARM.over, ARM.set) : slot.y + (CARRY_Y - slot.y) * span(t, ARM.place, ARM.clear);
    out.yaw = sYaw;
  } else {
    const k = span(t, ARM.clear, ARM.home);
    travel(slot, home, k);
    out.y = CARRY_Y;
    out.yaw = sYaw * (1 - k);
  }
  return out;
}

type Joints = { yaw: THREE.Group; shoulder: THREE.Group; elbow: THREE.Group; wrist: THREE.Group; tool: THREE.Group; cups: THREE.Mesh };

/** IK: ángulos para que la tapa de la caja quede en `p`. */
function solve(p: Pose, j: Joints) {
  const dx = p.x - ROBOT_POS.x;
  const dz = p.z - ROBOT_POS.z;
  const phi = Math.atan2(-dz, dx);
  const r = Math.hypot(dx, dz);
  const y = p.y + TOOL_L - ARM_H0;
  const d = Math.min(Math.hypot(r, y), ARM_L1 + ARM_L2 - 1e-3);
  const c2 = THREE.MathUtils.clamp((d * d - ARM_L1 * ARM_L1 - ARM_L2 * ARM_L2) / (2 * ARM_L1 * ARM_L2), -1, 1);
  const a2 = -Math.acos(c2); // codo arriba
  const a1 = Math.atan2(y, r) - Math.atan2(ARM_L2 * Math.sin(a2), ARM_L1 + ARM_L2 * Math.cos(a2));
  j.yaw.rotation.y = phi;
  j.shoulder.rotation.z = a1;
  j.elbow.rotation.z = a2;
  j.wrist.rotation.z = -(a1 + a2);
  j.tool.rotation.y = p.yaw - phi;
}

function usePieces() {
  const pieces = useMemo(() => {
    const tool = buildPalTool();
    return {
      base: buildPalBase(),
      turret: buildPalTurret(),
      upper: buildPalUpperArm(),
      forearm: buildPalForearm(),
      wrist: buildPalWrist(),
      tool: tool.tool,
      cups: tool.cups,
      cabinet: buildCabinet(),
    };
  }, []);
  useEffect(
    () => () =>
      Object.values(pieces).forEach((o) =>
        o.traverse((c) => {
          if (c instanceof THREE.Mesh) c.geometry.dispose();
        }),
      ),
    [pieces],
  );
  return pieces;
}

/** Cajas de los pallets (versión lejana del modelo) en un solo instanced por malla. */
function useFarBox() {
  const { scene } = useGLTF(LINE_BOX_FAR_URL);
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 }[] = [];
    scene.traverse((o: THREE.Object3D) => {
      if (o instanceof THREE.Mesh) list.push({ geometry: o.geometry, material: o.material as THREE.Material, local: o.matrixWorld.clone() });
    });
    return list;
  }, [scene]);
}

let shared: { paint: THREE.MeshStandardMaterial; rubber: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial } | null = null;
function stationMaterials() {
  if (shared) return shared;
  const steel = robotMaterials().steel;
  shared = {
    // Pintura amarilla del autoelevador: mismo grunge que el acero, poco metal.
    paint: new THREE.MeshStandardMaterial({ map: steel.map, roughnessMap: steel.roughnessMap, bumpMap: steel.bumpMap, bumpScale: 0.3, metalness: 0.25, roughness: 1, vertexColors: true }),
    rubber: new THREE.MeshStandardMaterial({ color: "#141516", roughness: 0.85, metalness: 0, vertexColors: true }),
    wood: new THREE.MeshStandardMaterial({ map: steel.map, roughness: 0.9, metalness: 0, vertexColors: true }),
  };
  return shared;
}

export default function AssemblyPalletizer({ rim }: { rim: string }) {
  const pieces = usePieces();
  const farBox = useFarBox();
  const mats = stationMaterials();
  const palletGeo = useMemo(buildPalletGeometry, []);
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffd27a", toneMapped: false, vertexColors: true }), []);
  const fork = useMemo(() => buildForklift(mats.paint, mats.rubber, lightMat), [mats, lightMat]);
  useEffect(() => () => palletGeo.dispose(), [palletGeo]);

  const j = useRef<Partial<Joints>>({});
  const forkRef = useRef<THREE.Group>(null);
  const status = useRef(0);
  const sensor = useRef(0);
  const stopper = useRef<THREE.Group>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const vacuum = useRef<THREE.MeshBasicMaterial>(null);
  const boxRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const palletRef = useRef<THREE.InstancedMesh>(null);

  const tmp = useMemo(
    () => ({
      ev: { n: -1, tau: 0, slot: 0, yaw: 0, flip: 0 } as ArmEvent,
      st: newStationState(),
      pose: { x: 0, y: 0, z: 0, yaw: 0 } as Pose,
      o: new THREE.Object3D(),
      m: new THREE.Matrix4(),
      pal: new THREE.Matrix4(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { ev, st, pose, o, m, pal } = tmp;
    armEvent(t, ev);
    stationAt(t, st);
    const joints = j.current as Joints;
    if (joints.yaw) {
      solve(toolPose(ev, pose), joints);
      // Ventosas: se aplastan al hacer vacío.
      const squash = ev.n >= 0 ? span(ev.tau, ARM.down - 0.1, ARM.grip) * (1 - span(ev.tau, ARM.set, ARM.place)) : 0;
      joints.cups.scale.y = 1 - 0.25 * squash;
      if (vacuum.current) vacuum.current.color.set(squash > 0.5 ? rim : "#331a00");
      status.current = ev.n >= 0 ? 1 : 0;
    }
    sensor.current = ev.n >= 0 && ev.tau < ARM.grip ? 1 : 0;
    if (stopper.current) stopper.current.rotation.x = -Math.PI / 2 + (Math.PI / 2) * stopperDown(t);
    if (beam.current) beam.current.opacity = sensor.current ? 0.75 : 0.25;

    // --- autoelevador
    const f = st.fork;
    const fk = forkRef.current;
    if (fk) {
      fk.visible = f.visible;
      fk.position.set(f.x, 0, f.z);
      fk.rotation.y = f.yaw;
      fork.carriage.position.y = f.lift;
      fork.front.rotation.z = -f.u / 0.23;
      fork.rear.rotation.z = -f.u / 0.19;
      fk.updateMatrixWorld();
    }

    // --- pallets y cajas
    let np = 0;
    let nb = 0;
    const putBox = (x: number, y: number, z: number, yaw: number, parent?: THREE.Matrix4) => {
      o.position.set(x, y, z);
      o.rotation.set(0, yaw, 0);
      o.scale.setScalar(LINE_BOX_SCALE);
      o.updateMatrix();
      if (parent) o.matrix.premultiply(parent);
      farBox.forEach((part, i) => boxRefs.current[i]?.setMatrixAt(nb, m.multiplyMatrices(o.matrix, part.local)));
      nb++;
    };
    const putPallet = (matrix: THREE.Matrix4) => {
      palletRef.current?.setMatrixAt(np++, matrix);
    };
    const palletAt = (x: number, y: number, z: number, ry: number) => pal.compose(tmp.v.set(x, y, z), tmp.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, ry), o.scale.set(1, 1, 1));

    if (st.pallet) {
      putPallet(palletAt(PALLET_POS.x, 0, PALLET_POS.z, 0));
      for (let s = 0; s < st.boxes; s++) {
        const [x, y, z] = slotOffset(s);
        putBox(PALLET_POS.x + x, y, PALLET_POS.z + z, slotYaw(s));
      }
    }
    if (f.visible && f.load !== "none" && fk) {
      // Pallet sobre las uñas: centro a 0,53 del talón, girado como el autoelevador.
      pal.copy(fk.matrixWorld).multiply(tmp.m.makeTranslation(0.53, f.lift, 0)).multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      const carried = pal.clone();
      putPallet(carried);
      if (f.load === "full") {
        for (let s = 0; s < 8; s++) {
          const [x, y, z] = slotOffset(s);
          putBox(x, y, z, slotYaw(s), carried);
        }
      }
    }
    // Caja en las ventosas.
    if (ev.n >= 0 && ev.tau >= ARM.grip && ev.tau < ARM.place) {
      putBox(pose.x, pose.y - BOX_TOP_ABOVE_ORIGIN, pose.z, pose.yaw + ev.flip);
    }
    for (const sp of STATIC_PALLETS) {
      putPallet(palletAt(sp.x, 0, sp.z, sp.ry));
      const y0 = 0.144 + LINE_BOX_HALF_H;
      const pts: [number, number, number, number][] = [
        [-0.25, y0, -0.02, 0],
        [0.24, y0, 0.03, 0.08],
        [-0.02, y0 + 0.402, 0.02, -0.12],
      ];
      for (const [x, y, z, r] of pts.slice(0, sp.boxes)) {
        const c = Math.cos(sp.ry);
        const s = Math.sin(sp.ry);
        putBox(sp.x + x * c + z * s, y, sp.z - x * s + z * c, sp.ry + r);
      }
    }
    for (let k = 0; k < EMPTY_STACK.n; k++) putPallet(palletAt(EMPTY_STACK.x + (k % 2) * 0.02, k * 0.145, EMPTY_STACK.z + (k === 2 ? 0.03 : 0), k * 0.03));

    if (palletRef.current) {
      palletRef.current.count = np;
      palletRef.current.instanceMatrix.needsUpdate = true;
    }
    boxRefs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.count = nb;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  const stopX = PICK_X + 0.245;
  const farZ = RUN_Z - BELT_W / 2 - 0.07;

  return (
    <group>
      {/* brazo */}
      <group position={[ROBOT_POS.x, 0, ROBOT_POS.z]}>
        <primitive object={pieces.base} />
        <StackLight position={[-0.3, 0.06, -0.3]} stateRef={status} scale={0.75} />
        <group ref={(g) => void (j.current.yaw = g ?? undefined)} position-y={TURRET_Y}>
          <primitive object={pieces.turret} />
          <group ref={(g) => void (j.current.shoulder = g ?? undefined)} position-y={ARM_H0 - TURRET_Y}>
            <primitive object={pieces.upper} />
            <group ref={(g) => void (j.current.elbow = g ?? undefined)} position-x={ARM_L1}>
              <primitive object={pieces.forearm} />
              <group ref={(g) => void (j.current.wrist = g ?? undefined)} position-x={ARM_L2}>
                <primitive object={pieces.wrist} />
                {/* anillo de estado de la muñeca */}
                <mesh position-y={-0.09} rotation-x={-Math.PI / 2}>
                  <torusGeometry args={[0.068, 0.008, 6, 24]} />
                  <meshBasicMaterial ref={vacuum} color="#331a00" toneMapped={false} />
                </mesh>
                <group ref={(g) => void (j.current.tool = g ?? undefined)}>
                  <primitive object={pieces.tool} />
                  <primitive object={pieces.cups} ref={(c: THREE.Mesh | null) => void (j.current.cups = c ?? undefined)} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* gabinete de control con baliza */}
      <group position={[ROBOT_POS.x - 1.25, 0, ROBOT_POS.z - 0.7]} rotation-y={0.5}>
        <primitive object={pieces.cabinet} />
        <StackLight position={[0.2, 1.4, 0]} stateRef={status} scale={0.7} />
      </group>

      {/* tope neumático y barrera óptica sobre la cinta */}
      <group position={[stopX, BELT_TOP + 0.16, farZ]}>
        <mesh position={[0, 0.05, -0.04]}>
          <boxGeometry args={[0.1, 0.22, 0.08]} />
          <meshStandardMaterial color="#2b3134" metalness={0.8} roughness={0.4} />
        </mesh>
        <group ref={stopper}>
          <mesh position={[0, 0, 0.42]}>
            <boxGeometry args={[0.03, 0.06, 0.84]} />
            <meshStandardMaterial color="#d9a400" metalness={0.35} roughness={0.5} />
          </mesh>
        </group>
      </group>
      <group position={[PICK_X - 0.05, BELT_TOP + 0.2, RUN_Z]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0, s * (BELT_W / 2 + 0.1)]}>
            <boxGeometry args={[0.06, 0.1, 0.05]} />
            <meshStandardMaterial color="#1d2224" metalness={0.7} roughness={0.45} />
          </mesh>
        ))}
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.004, 0.004, BELT_W + 0.15, 4]} />
          <meshBasicMaterial ref={beam} color="#ff3b2f" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <StackLight position={[0, 0.05, -(BELT_W / 2 + 0.1)]} stateRef={sensor} scale={0.35} />
      </group>

      {/* pallets y cajas apiladas */}
      <instancedMesh ref={palletRef} args={[palletGeo, mats.wood, PALLET_SLOTS]} frustumCulled={false} />
      {farBox.map((part, i) => (
        <instancedMesh key={i} ref={(mesh) => void (boxRefs.current[i] = mesh)} args={[part.geometry, part.material, BOX_SLOTS]} frustumCulled={false} />
      ))}

      {/* autoelevador con su conductor */}
      <group ref={forkRef} visible={false}>
        <primitive object={fork.chassis} />
        <primitive object={fork.carriage} />
        <primitive object={fork.front} />
        <primitive object={fork.rear} />
        <Worker kind="driver" position={[-1.2, -0.12, 0]} rotationY={Math.PI / 2} vest="#e8731a" helmet="#d9a400" />
      </group>
    </group>
  );
}

/** Puerta C (autoelevadores): hueco en la pared, túnel y persiana que sube cuando sale el autoelevador. */
export const FORK_DOOR = { x: FORK_DOOR_X, w: 1.9, h: 2.4 };
export const FORK_TUNNEL_Z = WALL_Z - 3.6;
