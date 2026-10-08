import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import RobotBase, { RobotTurret } from "./RobotBase";

/**
 * Brazo ensamblado con sus modelos de Meshy (pedestal y torreta son
 * procedurales, ver RobotBase.tsx). Cada articulación es un <group>
 * con la rotación en su propio eje, y los modelos cuelgan de él desplazados
 * para que su pivote caiga en el origen del grupo. Las constantes de abajo
 * son medidas reales de cada modelo (render ortográfico con grilla); si se
 * regenera un modelo hay que volver a medirlas.
 *
 * Convención: el brazo se extiende hacia +X; `yaw` lo gira sobre Y; las
 * rotaciones de hombro/codo/muñeca son sobre Z (positivo = sube).
 */

const URL = {
  segmento: "/models/segmento.glb",
  cuerpo: "/models/cuerpo.glb",
  dedo: "/models/dedo.glb",
};

// --- medidas del modelo (unidades del .glb, escala 1) ---
const BASE_HALF_H = 0.75; // el origen del modelo está al centro; mide 1,5 de alto
const SEG_PIVOT = 0.766; // centro de cada disco, desde el centro del segmento
const BODY_TOP = 0.9; // tope de la brida de muñeca, sobre el centro del cuerpo
const LUG = { x: 0.355, y: -0.76 }; // perno de cada oreja, desde el centro del cuerpo
const FINGER_PIVOT = { x: -0.39, y: 0.77 }; // agujero del dedo, desde su centro

// --- escalas elegidas para que las proporciones se lean bien ---
export const BASE_SCALE = 0.8;
export const SEG1_SCALE = 1;
export const SEG2_SCALE = 0.85;
export const GRIP_SCALE = 0.4;

const SEG1_LEN = SEG_PIVOT * 2 * SEG1_SCALE;
const SEG2_LEN = SEG_PIVOT * 2 * SEG2_SCALE;
const BASE_TOP = BASE_HALF_H * 2 * BASE_SCALE; // altura del plano superior de la base
const SHOULDER_Y = BASE_TOP + 0.25; // eje del hombro sobre la torreta

export const ARM = { SEG1_LEN, SEG2_LEN, SHOULDER_Y, GRIP_SCALE };

export type ArmPose = {
  /** Giro de la base sobre Y (rad). */
  yaw: number;
  /** Hombro (rad, sobre Z). */
  shoulder: number;
  /** Codo, relativo al segmento anterior (rad). */
  elbow: number;
  /** Apertura de la garra: 0 = cerrada sobre la caja, 1 = bien abierta. */
  grip: number;
};

const OPEN_ANGLE = 0.5; // rad que gira cada dedo con grip = 1

function useClone(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => scene.clone(true), [scene]);
}

type RobotArmProps = {
  /** Pose mutable: quien anima (GSAP, el controlador) la modifica y el brazo
   *  la lee en cada frame, sin pasar por el render de React. */
  poseRef: MutableRefObject<ArmPose>;
};

export default function RobotArm({ poseRef }: RobotArmProps) {
  const seg1 = useClone(URL.segmento);
  const seg2 = useClone(URL.segmento);
  const body = useClone(URL.cuerpo);
  const fingerR = useClone(URL.dedo);
  const fingerL = useClone(URL.dedo);

  const yawRef = useRef<Group>(null);
  const shoulderRef = useRef<Group>(null);
  const elbowRef = useRef<Group>(null);
  const wristRef = useRef<Group>(null);
  const fingerRRef = useRef<Group>(null);
  const fingerLRef = useRef<Group>(null);

  useFrame(() => {
    const pose = poseRef.current;
    const open = pose.grip * OPEN_ANGLE;
    if (yawRef.current) yawRef.current.rotation.y = pose.yaw;
    if (shoulderRef.current) shoulderRef.current.rotation.z = pose.shoulder;
    if (elbowRef.current) elbowRef.current.rotation.z = pose.elbow;
    // La muñeca compensa hombro + codo para que la garra cuelgue siempre vertical.
    if (wristRef.current) wristRef.current.rotation.z = -(pose.shoulder + pose.elbow);
    // Abrir = el dedo derecho gira hacia +Z (antihorario) y se aleja del centro; el izquierdo, al revés.
    if (fingerRRef.current) fingerRRef.current.rotation.z = open;
    if (fingerLRef.current) fingerLRef.current.rotation.z = -open;
  });

  return (
    <group>
      {/* Base fija: el piso está en y = 0 */}
      <group position={[0, BASE_HALF_H * BASE_SCALE, 0]} scale={BASE_SCALE}>
        <RobotBase />
      </group>

      <group ref={yawRef} position={[0, BASE_TOP, 0]}>
        {/* Torreta giratoria: plato + horquilla del hombro (procedural) */}
        <RobotTurret />

        <group ref={shoulderRef} position={[0, SHOULDER_Y - BASE_TOP, 0]}>
          <group position={[SEG_PIVOT * SEG1_SCALE, 0, 0]} scale={SEG1_SCALE}>
            <primitive object={seg1} />
          </group>

          <group ref={elbowRef} position={[SEG1_LEN, 0, 0]}>
            <group position={[SEG_PIVOT * SEG2_SCALE, 0, 0]} scale={SEG2_SCALE}>
              <primitive object={seg2} />
            </group>

            <group ref={wristRef} position={[SEG2_LEN, 0, 0]}>
              {/* Garra: el tope de la brida de muñeca queda en el pivote */}
              <group scale={GRIP_SCALE}>
                <group position={[0, -BODY_TOP, 0]}>
                  <primitive object={body} />
                </group>

                {/* Dedo derecho: pivota en la oreja derecha */}
                <group ref={fingerRRef} position={[LUG.x, LUG.y - BODY_TOP, 0]}>
                  <group position={[-FINGER_PIVOT.x, -FINGER_PIVOT.y, 0]}>
                    <primitive object={fingerR} />
                  </group>
                </group>

                {/* Dedo izquierdo: el mismo modelo espejado en X */}
                <group ref={fingerLRef} position={[-LUG.x, LUG.y - BODY_TOP, 0]}>
                  <group position={[FINGER_PIVOT.x, -FINGER_PIVOT.y, 0]} scale={[-1, 1, 1]}>
                    <primitive object={fingerL} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

Object.values(URL).forEach((u) => useGLTF.preload(u));
