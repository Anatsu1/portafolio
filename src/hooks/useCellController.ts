import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import type { Group } from "three";
import type { ArmPose } from "../components/sections/celda/RobotArm";
import { solveIK, type ReachTarget } from "../components/sections/celda/kinematics";
import { BOX_SCALE } from "../components/sections/celda/CargoBox";
import {
  BOX_HALF_H,
  DELIVERY,
  HOLD_AUTO_S,
  SHOWCASE_SCALE,
  cartesian,
  facingCamera,
  facingOutward,
  slotFor,
  yawFlip,
  type Polar,
} from "../components/sections/celda/cellLayout";

const HOVER_Y = 0.9; // altura del centro de la caja al pasar por encima de todo
const GRASP_Y = BOX_HALF_H;
const GRIP_OPEN = 1;
const GRIP_CLOSED = 0.2; // no 0: así las almohadillas apoyan en la cara de la caja sin atravesarla
/**
 * Velocidad base de TODAS las acciones del brazo (automático y manual por
 * igual): un poco más rápida que la coreografía original (×1) y sin acelerarse
 * nunca más, ni siquiera cuando el visitante pide otra caja a medio camino.
 */
const BASE_SPEED = 1.25;
/**
 * Pose de descanso: el brazo mira hacia la DERECHA, sobre el mismo ángulo en
 * que deja la caja en la plataforma de entrega, pero flexionado hacia arriba
 * (replegado cerca de la base y con la garra en alto). Desde ahí se agacha a
 * buscar la próxima caja; el yaw se interpola como ángulo continuo, así que
 * puede girar hasta 360° cuando hace falta.
 */
const HOME: ReachTarget = { phi: DELIVERY.phi, r: 1.15, y: 1.55 };

export type CellMode = "auto" | "manual" | "pilot";

/** Controles del modo piloto (teclado o botones en pantalla). */
export type PilotKey = "left" | "right" | "forward" | "back" | "up" | "down";

const PILOT_YAW_SPEED = 1.5; // rad/s
const PILOT_REACH_SPEED = 1.3; // unidades/s
const PILOT_LIFT_SPEED = 1.5;
const PILOT_R_MIN = 0.95;
const PILOT_R_MAX = 2.65;
const PILOT_Y_MAX = 1.9;
const PILOT_GRAB_DIST = 0.42; // distancia horizontal máxima garra–caja para agarrarla
const PILOT_GRAB_DY = 0.4;
const PHYS_FINGER_R = 0.34; // distancia de contacto dedo–centro de caja (grosor del dedo + media caja)
const PHYS_FINGER_HALF = 0.15; // los dedos son largos en sentido radial: segmento de ±este largo
const PHYS_LOW_Y = 0.8; // por encima de esta altura del centro de la garra las puntas no tocan las cajas del piso
const PHYS_BOX_DIST = 0.5; // distancia mínima entre centros de dos cajas
const PHYS_SETTLE_S = 1.4; // quietas y corridas de su lugar: vuelven solas pasado este tiempo
const PHYS_BASE_R = 1.0;
// Tope del paso de la física; en desarrollo con `?nolag` (render a ~1 cuadro/s) se deja pasar el tiempo real.
const PHYS_MAX_DT = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nolag") ? 0.5 : 0.05; // radio de la torreta: las cajas no entran
const PHYS_MAX_R = 3.3;
const PILOT_PAD_DIST = 0.6; // radio de la plataforma de entrega para "dejar la caja"

// Solo en desarrollo: `?nolag` hace que las animaciones sigan el reloj real
// aunque el render sea lento (navegador headless con GPU por software). GSAP
// por defecto "suaviza" los cuadros largos y las pruebas automáticas corrían
// a cámara lenta. En producción este bloque no existe.
if (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nolag")) {
  gsap.ticker.lagSmoothing(0);
}

/** Comandos que la interfaz (botones, clic en cajas, panel) le manda al controlador. */
export type CellCommands = {
  /** Trae la caja `index` (sección o tecnología) a la plataforma (si ya está en cola o en curso, no hace nada). */
  show: (index: number) => void;
  /** Cierra el panel y devuelve la caja a su lugar. */
  release: () => void;
  /** Congela o reanuda la espera del panel (mientras el visitante lo lee). */
  holdPause: (paused: boolean) => void;
  /** Modo piloto: mantiene apretada (o suelta) una dirección. */
  pilotKey: (key: PilotKey, down: boolean) => void;
  /** Modo piloto: cierra la garra (agarra la caja que tenga debajo) o la abre (suelta). */
  pilotGrab: () => void;
};

type ControllerOptions = {
  /** Cajas que recorre el modo automático (las secciones). */
  count: number;
  active: boolean;
  mode: CellMode;
  /** Qué caja está en curso (yendo, en la plataforma o volviendo), o null. */
  onShowing?: (index: number | null) => void;
  /** Qué caja está mostrándose en la plataforma (panel abierto), o null. */
  onDelivered?: (index: number | null) => void;
  commandsRef: MutableRefObject<CellCommands | null>;
  /** Apertura de la tapa de cada caja (0..1); el controlador la anima. */
  openRefs: MutableRefObject<number>[];
  /** Acercamiento de cámara (0..1) que el controlador pide al ir por una caja del estante trasero. */
  zoomRef?: MutableRefObject<number>;
};

/** Ajusta `to` por múltiplos de 2π para que el giro desde `from` sea el más corto. */
function nearestAngle(from: number, to: number) {
  return to + Math.PI * 2 * Math.round((from - to) / (Math.PI * 2));
}

/**
 * Controla el brazo y las cajas. Hay una cola de "mostrar caja N" y cada
 * tarea es una máquina de tres fases, sin depender de tiempos exactos:
 *
 *   ir     → el brazo agarra la caja, la lleva a la plataforma y se aparta
 *            (la caja crece y gira de frente a la cámara; panel abierto).
 *   espera → la caja queda mostrada. En manual espera hasta que se cierre el
 *            panel; en automático corre una cuenta de `HOLD_AUTO_S` que el
 *            visitante frena mientras lee.
 *   volver → la caja recupera su tamaño y el brazo la devuelve a su lugar.
 *
 * Cada fase es su propio tramo de GSAP; un objetivo en polares se mueve y la
 * cinemática inversa lo traduce a ángulos en cada frame. La caja agarrada
 * sigue al objetivo.
 *
 * Tiene que usarse dentro de <Canvas> (usa `useFrame`).
 */
type Phase = "ir" | "espera" | "volver";
type Task = {
  index: number;
  phase: Phase;
  /** El visitante pidió cerrar el panel antes de llegar a la espera (el panel abre mientras el brazo aún se aparta). */
  releaseAsked?: boolean;
  /** La caja ya está sobre la plataforma (agrandada y con el panel abierto). */
  showcased?: boolean;
  /**
   * La garra ya soltó la caja sobre el destino. En el viaje de ida eso pasa
   * ~0,7s ANTES de `showcased` (el brazo se retira primero): sin esta marca,
   * un pedido nuevo en esa ventana caía en el `finish()` de "no la tomó" y
   * la caja quedaba abandonada en la plataforma (bug visto en una grabación:
   * CONTACTO fuera de su slot, colgada a la derecha del brazo).
   */
  released?: boolean;
  /** Tramo de movimiento en curso (fases ir y volver). */
  tl: gsap.core.Timeline | null;
  /** Cuenta regresiva de la espera (solo en automático). */
  timer: gsap.core.Tween | null;
};

export function useCellController({ count, active, mode, onShowing, onDelivered, commandsRef, openRefs, zoomRef }: ControllerOptions) {
  const poseRef = useRef<ArmPose>({ yaw: HOME.phi, shoulder: 0.5, elbow: -1.1, grip: 0.6 });
  const boxRefs = useRef<(Group | null)[]>([]);
  const reach = useRef<ReachTarget>({ ...HOME });
  const carried = useRef<Group | null>(null);
  const carriedFlip = useRef(0); // media vuelta extra de las cajas del estante (ver yawFlip)

  const queue = useRef<number[]>([]);
  const task = useRef<Task | null>(null);
  const idle = useRef<gsap.core.Timeline | null>(null);
  const cursor = useRef(0);
  const reading = useRef(false); // el visitante está leyendo: frena la cuenta regresiva
  const live = useRef({ active, mode, count, onShowing, onDelivered });
  live.current = { active, mode, count, onShowing, onDelivered };
  const kick = useRef<(() => void) | null>(null);
  const sync = useRef<(() => void) | null>(null);
  const modeChanged = useRef<(() => void) | null>(null);
  const wasPilot = useRef(false);

  const pilotKeys = useRef<Record<PilotKey, boolean>>({ left: false, right: false, forward: false, back: false, up: false, down: false });
  const pilotVel = useRef({ yaw: 0, reach: 0, lift: 0 });
  const pilotGrabFn = useRef<(() => void) | null>(null);
  const physicsStep = useRef<((dt: number) => void) | null>(null);

  useFrame((_, rawDt) => {
    const live_ = live.current;
    if (zoomRef) {
      const t = task.current;
      // Se acerca la cámara mientras el brazo va por una caja del estante (o la devuelve).
      const shelf = t && t.index >= live_.count && ((t.phase === "ir" && !t.released) || t.phase === "volver");
      zoomRef.current = shelf ? 1 : 0;
    }
    if (live_.mode === "pilot" && live_.active) {
      const dt = Math.min(rawDt, 0.1);
      const k = pilotKeys.current;
      const v = pilotVel.current;
      const ease = Math.min(1, dt * 12);
      v.yaw += ((Number(k.right) - Number(k.left)) * PILOT_YAW_SPEED - v.yaw) * ease;
      v.reach += ((Number(k.forward) - Number(k.back)) * PILOT_REACH_SPEED - v.reach) * ease;
      v.lift += ((Number(k.up) - Number(k.down)) * PILOT_LIFT_SPEED - v.lift) * ease;
      const t = reach.current;
      t.phi += v.yaw * dt;
      t.r = Math.min(PILOT_R_MAX, Math.max(PILOT_R_MIN, t.r + v.reach * dt));
      t.y = Math.min(PILOT_Y_MAX, Math.max(GRASP_Y, t.y + v.lift * dt));
    }
    solveIK(reach.current, poseRef.current);
    if (live_.active) physicsStep.current?.(Math.min(rawDt, PHYS_MAX_DT));
    const box = carried.current;
    if (box) {
      const [x, y, z] = cartesian(reach.current, reach.current.y);
      box.position.set(x, y, z);
      box.rotation.y = facingOutward(reach.current.phi) + carriedFlip.current;
    }
  });

  useEffect(() => {
    const target = reach.current;
    const grip = poseRef.current;

    /** Aplica la pausa que corresponde: fuera de pantalla todo se congela; leyendo, solo la cuenta. */
    const applyPause = () => {
      const off = !live.current.active;
      idle.current?.paused(off);
      const t = task.current;
      if (!t) return;
      t.tl?.paused(off);
      t.timer?.paused(off || reading.current);
    };
    sync.current = applyPause;

    /**
     * En la plataforma la caja crece, sube y gira de frente a la cámara y,
     * cuando ya está firme, se abre la tapa. Al terminar la espera se cierra la
     * tapa primero y recién después la caja vuelve a su tamaño.
     */
    const showcase = (index: number, on: boolean) => {
      const box = boxRefs.current[index];
      if (!box) return;
      const d = (seconds: number) => seconds / BASE_SPEED; // fuera de las líneas de tiempo hay que escalar a mano
      const lid = openRefs[index];
      gsap.killTweensOf([box.scale, box.position, box.rotation, lid]);
      const [px, , pz] = cartesian(DELIVERY, 0);
      if (on) {
        const s = BOX_SCALE * SHOWCASE_SCALE;
        const face = nearestAngle(box.rotation.y, facingCamera(px, pz));
        gsap.to(box.scale, { x: s, y: s, z: s, duration: d(0.9), ease: "back.out(1.5)" });
        gsap.to(box.position, { y: BOX_HALF_H * SHOWCASE_SCALE, duration: d(0.9), ease: "power2.out" });
        gsap.to(box.rotation, { y: face - 0.4, duration: d(0.9), ease: "power2.out" });
        gsap.to(box.rotation, { y: face + 0.4, duration: d(3.4), ease: "sine.inOut", yoyo: true, repeat: -1, delay: d(0.9) });
        gsap.to(lid, { current: 1, duration: d(0.5), delay: d(0.85), ease: "none" }); // la tapa sigue un resorte propio
      } else {
        const back = nearestAngle(box.rotation.y, facingOutward(DELIVERY.phi) + yawFlip(index));
        gsap.to(lid, { current: 0, duration: d(0.3), ease: "none" });
        gsap.to(box.scale, { x: BOX_SCALE, y: BOX_SCALE, z: BOX_SCALE, duration: d(0.6), ease: "power2.inOut", delay: d(0.7) });
        gsap.to(box.position, { y: BOX_HALF_H, duration: d(0.6), ease: "power2.inOut", delay: d(0.7) });
        gsap.to(box.rotation, { y: back, duration: d(0.6), ease: "power2.inOut", delay: d(0.7) });
      }
    };

    /**
     * Suelta la caja que lleva la garra y la deja EXACTAMENTE en `to`, apoyada en
     * el piso. La caja agarrada solo se actualiza cuando se dibuja un cuadro; si la
     * garra termina de bajar y suelta entre dos cuadros (render lento) la caja
     * quedaba con la altura del último cuadro, flotando. Fijar la posición final
     * acá hace que el resultado no dependa de la tasa de cuadros.
     */
    const dropAt = (to: Polar) => {
      const box = carried.current;
      if (box) {
        const [x, y, z] = cartesian(to, GRASP_Y);
        box.position.set(x, y, z);
        box.rotation.y = facingOutward(to.phi) + carriedFlip.current;
      }
      carried.current = null;
    };

    /** Desliza una caja suelta de vuelta a su lugar, con un pequeño salto. */
    // Estado de la física de las cajas sueltas (la garra las empuja al pasar baja).
    const total = boxRefs.current.length || 32;
    const phys = {
      vx: new Float32Array(total),
      vz: new Float32Array(total),
      spin: new Float32Array(total),
      idle: new Float32Array(total),
      gx: NaN,
      gz: NaN,
    };
    const homing = new Set<number>(); // cajas que están volviendo a su lugar: la física las deja en paz
    const slideHome = (index: number) => {
      const box = boxRefs.current[index];
      if (!box) return;
      homing.add(index);
      gsap.delayedCall(1.2, () => homing.delete(index));
      const slot = slotFor(index);
      const [x, , z] = cartesian(slot, GRASP_Y);
      gsap.killTweensOf([box.position, box.rotation]);
      gsap.to(box.position, { x, z, duration: 1, ease: "power2.inOut" });
      gsap.to(box.position, { y: GRASP_Y + 0.55, duration: 0.5, ease: "sine.out", yoyo: true, repeat: 1 });
      gsap.to(box.rotation, { y: nearestAngle(box.rotation.y, facingOutward(slot.phi) + yawFlip(index)), duration: 1, ease: "power2.inOut" });
    };

    /** Deja todas las cajas en su lugar, sin animar (cambio de modo). */
    const resetBoxes = () => {
      homing.clear();
      phys.vx.fill(0);
      phys.vz.fill(0);
      phys.spin.fill(0);
      phys.idle.fill(0);
      boxRefs.current.forEach((box, i) => {
        if (!box) return;
        gsap.killTweensOf([box.scale, box.position, box.rotation, openRefs[i]]);
        openRefs[i].current = 0;
        const slot = slotFor(i);
        const [x, y, z] = cartesian(slot, GRASP_Y);
        box.scale.setScalar(BOX_SCALE);
        box.position.set(x, y, z);
        box.rotation.y = facingOutward(slot.phi) + yawFlip(i);
      });
      carried.current = null;
    };

    /** Limpia lo que esté en curso (tarea, cola, reposo) al entrar o salir del modo piloto. */
    const clearAll = () => {
      // La cola se conserva: un pedido hecho desde el piloto (buscador, botones) se atiende al salir.
      const t = task.current;
      t?.tl?.kill();
      t?.timer?.kill();
      task.current = null;
      idle.current?.kill();
      idle.current = null;
      reading.current = false;
      resetBoxes();
      live.current.onShowing?.(null);
      live.current.onDelivered?.(null);
    };

    /** Piloto: cierra la garra (agarra) o la abre (suelta / entrega). */
    const pilotState = { closed: false, holding: -1 };
    const pilotGrab = () => {
      if (live.current.mode !== "pilot") return;
      const grip = poseRef.current;
      if (pilotState.closed) {
        pilotState.closed = false;
        gsap.to(grip, { grip: GRIP_OPEN, duration: 0.35, ease: "power2.out" });
        const box = carried.current;
        const index = pilotState.holding;
        pilotState.holding = -1;
        if (!box || index < 0) return;
        carried.current = null;
        const [px, , pz] = cartesian(DELIVERY, 0);
        if (Math.hypot(box.position.x - px, box.position.z - pz) < PILOT_PAD_DIST && !task.current) {
          // Entrega: queda sobre la plataforma, se muestra y abre el panel.
          const [x, y, z] = cartesian(DELIVERY, GRASP_Y);
          box.position.set(x, y, z);
          box.rotation.y = facingOutward(DELIVERY.phi) + yawFlip(index);
          task.current = { index, phase: "espera", showcased: true, released: true, tl: null, timer: null };
          live.current.onShowing?.(index);
          showcase(index, true);
          live.current.onDelivered?.(index);
        } else {
          // Cae al piso donde la soltó y, un momento después, vuelve sola a su lugar.
          gsap.killTweensOf(box.position);
          gsap.to(box.position, { y: GRASP_Y, duration: 0.3, ease: "bounce.out" });
          gsap.delayedCall(1.6, () => {
            if (carried.current !== box && live.current.mode === "pilot") slideHome(index);
          });
        }
        return;
      }
      pilotState.closed = true;
      gsap.to(grip, { grip: GRIP_CLOSED, duration: 0.3, ease: "power2.inOut" });
      // ¿Hay una caja a mano? La más cercana a la garra.
      const t = reach.current;
      const [gx, gy, gz] = cartesian(t, t.y);
      let best = -1;
      let bestD = PILOT_GRAB_DIST;
      boxRefs.current.forEach((box, i) => {
        // La caja que está en la plataforma (abierta) también se puede tomar cerrando la garra.
        const onPad = task.current?.index === i && task.current.released && task.current.phase === "espera";
        if (!box || (task.current?.index === i && !onPad)) return;
        const d = Math.hypot(box.position.x - gx, box.position.z - gz);
        if (d < bestD && Math.abs(box.position.y - gy) < PILOT_GRAB_DY) {
          best = i;
          bestD = d;
        }
      });
      if (best >= 0) {
        const box = boxRefs.current[best]!;
        if (task.current?.index === best) {
          // Sale de la plataforma: cierra el panel y la caja vuelve a su tamaño mientras la lleva.
          task.current.timer?.kill();
          task.current = null;
          live.current.onShowing?.(null);
          live.current.onDelivered?.(null);
          gsap.killTweensOf([box.scale, openRefs[best]]);
          gsap.to(openRefs[best], { current: 0, duration: 0.25, ease: "none" });
          gsap.to(box.scale, { x: BOX_SCALE, y: BOX_SCALE, z: BOX_SCALE, duration: 0.4, ease: "power2.inOut" });
        }
        gsap.killTweensOf([box.position, box.rotation]);
        carried.current = box;
        carriedFlip.current = yawFlip(best);
        pilotState.holding = best;
      }
    };
    pilotGrabFn.current = pilotGrab;

    /**
     * Física simple de las cajas sueltas: si la garra (o la caja que lleva) pasa
     * baja, las empuja con un golpe que se amortigua por rozamiento; se chocan
     * entre sí, no entran en la torreta y, quietas y corridas, vuelven solas a su
     * lugar. Las cajas en uso (llevada, en la plataforma, en tarea) no se tocan.
     */
    physicsStep.current = (dt) => {
      if (dt <= 0) return;
      const t = reach.current;
      const [gx, , gz] = cartesian(t, 0);
      const gSpeed = Number.isNaN(phys.gx) ? 0 : Math.hypot(gx - phys.gx, gz - phys.gz) / dt;
      phys.gx = gx;
      phys.gz = gz;
      const low = t.y < PHYS_LOW_Y;
      // Ejes de la garra: radial (hacia afuera) y tangencial (por donde abren los dedos).
      const rl = Math.hypot(gx, gz) || 1;
      const rx = gx / rl;
      const rz = gz / rl;
      const [ax, , az] = cartesian({ phi: t.phi + 0.01, r: t.r }, 0);
      const tl_ = Math.hypot(ax - gx, az - gz) || 1;
      const tx = (ax - gx) / tl_;
      const tz = (az - gz) / tl_;
      const gripOpen = poseRef.current.grip;
      const pad = 0.17 + 0.35 * gripOpen; // distancia de cada almohadilla al eje de la garra
      const boxes = boxRefs.current;
      const free: number[] = [];
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (!box || box === carried.current || task.current?.index === i || homing.has(i)) continue;
        // Una caja con escala o altura de "mostrada" no es del piso.
        if (box.position.y > GRASP_Y + 0.15) continue;
        free.push(i);
        if (low && gripOpen > 0.5 && Math.hypot(box.position.x - gx, box.position.z - gz) > PILOT_GRAB_DIST) {
          // Cada dedo es un segmento radial a un lado de la garra: una caja que
          // queda entre los dos (a punto de agarrarse) no se toca.
          for (const side of [-1, 1]) {
            const cx = gx + tx * side * pad;
            const cz = gz + tz * side * pad;
            const along = Math.max(-PHYS_FINGER_HALF, Math.min(PHYS_FINGER_HALF, (box.position.x - cx) * rx + (box.position.z - cz) * rz));
            const px = cx + rx * along;
            const pz = cz + rz * along;
            const dx = box.position.x - px;
            const dz = box.position.z - pz;
            const d = Math.hypot(dx, dz);
            if (d >= PHYS_FINGER_R) continue;
            const nx = d > 1e-4 ? dx / d : tx * side;
            const nz = d > 1e-4 ? dz / d : tz * side;
            box.position.x += nx * (PHYS_FINGER_R - d);
            box.position.z += nz * (PHYS_FINGER_R - d);
            const kick = Math.min(3, 0.5 + gSpeed * 0.7);
            phys.vx[i] = nx * kick;
            phys.vz[i] = nz * kick;
            phys.spin[i] = (Math.random() - 0.5) * kick * 1.6;
          }
        }
      }
      // Entre cajas.
      for (let a = 0; a < free.length; a++) {
        for (let b = a + 1; b < free.length; b++) {
          const i = free[a];
          const j = free[b];
          const A = boxes[i]!;
          const B = boxes[j]!;
          const dx = B.position.x - A.position.x;
          const dz = B.position.z - A.position.z;
          const d = Math.hypot(dx, dz);
          if (d >= PHYS_BOX_DIST || d < 1e-4) continue;
          const nx = dx / d;
          const nz = dz / d;
          const half = (PHYS_BOX_DIST - d) / 2;
          A.position.x -= nx * half;
          A.position.z -= nz * half;
          B.position.x += nx * half;
          B.position.z += nz * half;
          // Se pasan algo de impulso (la que venía rápida arrastra a la otra).
          const rel = (phys.vx[i] - phys.vx[j]) * nx + (phys.vz[i] - phys.vz[j]) * nz;
          if (rel > 0) {
            phys.vx[j] += nx * rel * 0.7;
            phys.vz[j] += nz * rel * 0.7;
            phys.vx[i] -= nx * rel * 0.3;
            phys.vz[i] -= nz * rel * 0.3;
          }
        }
      }
      // Integración, límites y vuelta a casa.
      const damp = Math.exp(-4.5 * dt);
      for (const i of free) {
        const box = boxes[i]!;
        let vx = phys.vx[i];
        let vz = phys.vz[i];
        if (vx !== 0 || vz !== 0) {
          box.position.x += vx * dt;
          box.position.z += vz * dt;
          vx *= damp;
          vz *= damp;
          if (Math.hypot(vx, vz) < 0.04) vx = vz = 0;
          phys.vx[i] = vx;
          phys.vz[i] = vz;
        }
        if (phys.spin[i] !== 0) {
          box.rotation.y += phys.spin[i] * dt;
          phys.spin[i] *= damp;
          if (Math.abs(phys.spin[i]) < 0.02) phys.spin[i] = 0;
        }
        // La torreta y el borde del piso frenan la caja.
        const r = Math.hypot(box.position.x, box.position.z);
        const clampR = Math.min(PHYS_MAX_R, Math.max(PHYS_BASE_R, r));
        if (r > 1e-4 && clampR !== r) {
          box.position.x *= clampR / r;
          box.position.z *= clampR / r;
          phys.vx[i] = 0;
          phys.vz[i] = 0;
        }
        const [sx, , sz] = cartesian(slotFor(i), 0);
        const off = Math.hypot(box.position.x - sx, box.position.z - sz);
        const near = Math.hypot(box.position.x - gx, box.position.z - gz) < 0.95;
        if (off > 0.04 && phys.vx[i] === 0 && phys.vz[i] === 0 && !(low && near)) {
          phys.idle[i] += dt;
          if (phys.idle[i] > PHYS_SETTLE_S) {
            phys.idle[i] = 0;
            slideHome(i);
          }
        } else phys.idle[i] = 0;
      }
    };

    let marks = 0;
    /**
     * Agarra la caja de `from` y la deja en `to`. Los movimientos se solapan a
     * propósito (la garra abre mientras baja, el brazo gira mientras termina de
     * subir) para que se lea como una máquina manejada y no como pasos sueltos.
     */
    const pickAndPlace = (tl: gsap.core.Timeline, index: number, from: Polar, to: Polar) => {
      const label = (name: string, position: string) => {
        const id = `${name}-${marks++}`;
        tl.addLabel(id, position);
        return id;
      };

      // 1) Viaje en alto hasta encima de la caja; la garra se va preparando.
      tl.to(target, { phi: from.phi, r: from.r, y: HOVER_Y, duration: 1.4, ease: "power2.inOut" });
      tl.to(grip, { grip: 0.5, duration: 0.9, ease: "sine.inOut" }, "<0.1");

      // 2) Bajada: abre mientras baja, así ya está abierta cuando llega a la caja.
      const down = label("bajar", "-=0.25");
      tl.to(target, { y: GRASP_Y, duration: 0.85, ease: "power2.inOut" }, down);
      tl.to(grip, { grip: GRIP_OPEN, duration: 0.55, ease: "power2.out" }, `${down}-=0.3`);

      // 3) Contacto: cierra sobre la caja y recién ahí la toma.
      tl.to(grip, { grip: GRIP_CLOSED, duration: 0.5, ease: "power2.inOut" }, "-=0.05");
      tl.call(() => {
        carried.current = boxRefs.current[index];
        carriedFlip.current = yawFlip(index);
      });

      // 4) Sube y, antes de terminar de subir, ya empieza a girar hacia el destino (arco).
      const up = label("subir", "+=0.05");
      tl.to(target, { y: HOVER_Y, duration: 0.75, ease: "power2.inOut" }, up);
      tl.to(target, { phi: to.phi, r: to.r, duration: 1.6, ease: "power2.inOut" }, `${up}+=0.35`);

      // 5) Baja sobre el destino y suelta: abre apenas apoya.
      const place = label("apoyar", "-=0.3");
      tl.to(target, { y: GRASP_Y, duration: 0.85, ease: "power2.inOut" }, place);
      tl.to(grip, { grip: GRIP_OPEN, duration: 0.5, ease: "power2.out" }, "-=0.05");
      tl.call(() => {
        dropAt(to);
        if (task.current) task.current.released = true;
      });

      // 6) Se retira hacia arriba mientras la garra termina de abrir.
      tl.to(target, { y: HOVER_Y, duration: 0.7, ease: "power2.inOut" }, "<0.2");
      tl.to(grip, { grip: 0.5, duration: 0.7, ease: "sine.inOut" }, "<");
    };

    const goHome = () => {
      const tl = gsap.timeline();
      tl.timeScale(BASE_SPEED);
      tl.to(target, { ...HOME, duration: 1.4, ease: "power2.inOut" });
      tl.to(grip, { grip: 0.6, duration: 0.4 }, "<");
      idle.current = tl;
      applyPause();
    };

    /** Termina la espera: la caja recupera su tamaño y el brazo la devuelve. */
    const endHold = () => {
      const t = task.current;
      if (!t || t.phase !== "espera") return;
      t.timer?.kill();
      t.timer = null;
      reading.current = false;
      t.phase = "volver";
      showcase(t.index, false);
      live.current.onDelivered?.(null);

      if (live.current.mode === "pilot") {
        // Sin brazo automático: la caja vuelve sola a su lugar (el visitante sigue pilotando).
        const tl = gsap.timeline({ onComplete: finish });
        tl.to({}, { duration: 1.3 });
        tl.call(() => slideHome(t.index));
        tl.to({}, { duration: 1.1 });
        t.tl = tl;
        applyPause();
        return;
      }

      const tl = gsap.timeline({ onComplete: finish });
      tl.to({}, { duration: 1.4 }); // se cierra la tapa y la caja recupera su tamaño
      pickAndPlace(tl, t.index, DELIVERY, slotFor(t.index));
      tl.timeScale(BASE_SPEED);
      t.tl = tl;
      applyPause();
    };

    /** Llegó a la plataforma y se apartó: queda la caja mostrada. */
    const enterHold = () => {
      const t = task.current;
      if (!t) return;
      t.phase = "espera";
      t.tl = null;
      if (queue.current.length > 0 || t.releaseAsked) {
        endHold(); // el visitante ya pidió otra: no hace falta esperar
        return;
      }
      if (live.current.mode === "auto") t.timer = gsap.delayedCall(HOLD_AUTO_S, endHold);
      applyPause();
    };

    /**
     * El visitante pidió otra caja con la entrega todavía en camino: en vez de
     * terminar de llevarla, abrirla y cerrarla, el brazo la deja de vuelta en su
     * lugar y recién entonces sigue con la nueva.
     */
    const abortGo = () => {
      const t = task.current;
      if (!t || t.phase !== "ir") return;
      t.tl?.kill();
      t.tl = null;
      const box = boxRefs.current[t.index];
      if (t.showcased || t.released) {
        // Ya está sobre la plataforma — aunque todavía no se haya agrandado
        // (ventana entre soltar y `showcased`): es una espera que se corta.
        t.phase = "espera";
        endHold();
        return;
      }
      if (carried.current && carried.current === box) {
        t.phase = "volver";
        const slot = slotFor(t.index);
        const tl = gsap.timeline({ onComplete: finish });
        tl.to(target, { y: HOVER_Y, duration: 0.45, ease: "power2.inOut" });
        tl.to(target, { phi: slot.phi, r: slot.r, duration: 1.3, ease: "power2.inOut" });
        tl.to(target, { y: GRASP_Y, duration: 0.75, ease: "power2.inOut" });
        tl.to(grip, { grip: GRIP_OPEN, duration: 0.45, ease: "power2.out" }, "-=0.1");
        tl.call(() => dropAt(slot));
        tl.to(target, { y: HOVER_Y, duration: 0.6, ease: "power2.inOut" });
        tl.to(grip, { grip: 0.5, duration: 0.5, ease: "sine.inOut" }, "<");
        tl.timeScale(BASE_SPEED);
        t.tl = tl;
        applyPause();
        return;
      }
      finish(); // todavía no la había tomado: no hay nada que devolver
    };

    const finish = () => {
      task.current = null;
      live.current.onShowing?.(null);
      next();
    };

    const next = () => {
      if (task.current) return;
      const { active: isActive, mode: m, count: n } = live.current;
      if (!isActive || m === "pilot") return;

      let index = queue.current.shift();
      if (index === undefined && m === "auto") index = cursor.current++ % n;
      if (index === undefined) {
        if (!idle.current) goHome();
        return;
      }

      idle.current?.kill();
      idle.current = null;

      const slot = slotFor(index);
      const tl = gsap.timeline({ onComplete: enterHold });
      pickAndPlace(tl, index, slot, DELIVERY);
      tl.call(() => {
        if (task.current) task.current.showcased = true;
        showcase(index, true);
        live.current.onDelivered?.(index);
      });
      tl.to(target, { ...HOME, duration: 1.3, ease: "power2.inOut" }); // el brazo se aparta
      tl.to(grip, { grip: 0.6, duration: 0.4 }, "<");
      tl.timeScale(BASE_SPEED);
      task.current = { index, phase: "ir", tl, timer: null };
      live.current.onShowing?.(index);
      applyPause();
    };

    commandsRef.current = {
      show: (index) => {
        const t = task.current;
        // Ya se está mostrando (o yendo a buscar) esa misma caja.
        if (t && t.index === index && t.phase !== "volver") return;
        // Solo importa lo último que pidió el visitante: no se acumula una fila.
        queue.current = [index];
        if (t) {
          // Sin apurar nada: el brazo mantiene su ritmo. Si la caja está mostrada, se libera ya;
          // si todavía la lleva, la devuelve a su lugar antes de ir por la nueva.
          if (t.phase === "espera") endHold();
          else if (t.phase === "ir") abortGo();
        } else {
          next();
        }
      },
      release: () => {
        const t = task.current;
        if (t && t.phase === "ir") t.releaseAsked = true; // se aplica al llegar a la espera
        else endHold();
      },
      holdPause: (paused) => {
        reading.current = paused;
        applyPause();
      },
      pilotKey: (key, down) => {
        pilotKeys.current[key] = down;
      },
      pilotGrab,
    };

    kick.current = next;
    modeChanged.current = () => {
      const pilot = live.current.mode === "pilot";
      if (pilot !== wasPilot.current) {
        wasPilot.current = pilot;
        clearAll();
        pilotState.closed = false;
        pilotState.holding = -1;
        Object.keys(pilotKeys.current).forEach((key) => (pilotKeys.current[key as PilotKey] = false));
        if (pilot) gsap.to(poseRef.current, { grip: GRIP_OPEN, duration: 0.4 });
        return;
      }
      if (pilot) return;
      const t = task.current;
      if (!t || t.phase !== "espera") return;
      if (live.current.mode === "manual") {
        // Tomó el control mientras corría la cuenta: el panel queda hasta que lo cierre.
        t.timer?.kill();
        t.timer = null;
      } else if (!t.timer) {
        endHold(); // volvió a automático con un panel abierto: se cierra y retoma el ciclo
      }
    };

    if (import.meta.env.DEV) {
      // Solo desarrollo: coloca la garra directamente (las pruebas en headless van a ~1 cuadro por segundo).
      (window as unknown as { __cellPilotTo?: (r: ReachTarget) => void }).__cellPilotTo = (r) => Object.assign(reach.current, r);
      (window as unknown as { __cellDebug?: () => unknown }).__cellDebug = () => ({
        task: task.current && {
          index: task.current.index,
          phase: task.current.phase,
          timer: !!task.current.timer,
          showcased: !!task.current.showcased,
          released: !!task.current.released,
        },
        reach: [reach.current.phi, reach.current.r, reach.current.y].map((v) => Math.round(v * 100) / 100),
        grip: poseRef.current.grip,
        queue: [...queue.current],
        reading: reading.current,
        active: live.current.active,
        mode: live.current.mode,
        idle: !!idle.current,
        carried: boxRefs.current.findIndex((b) => b && b === carried.current),
        // Posición real de cada caja: la prueba automatizada del aborto las
        // compara contra `slotOf` para verificar que ninguna queda afuera.
        boxes: boxRefs.current.map((b) => (b ? b.position.toArray().map((v) => Math.round(v * 1000) / 1000) : null)),
      });
    }

    return () => {
      commandsRef.current = null;
      kick.current = null;
      pilotGrabFn.current = null;
      physicsStep.current = null;
      sync.current = null;
      modeChanged.current = null;
      task.current?.tl?.kill();
      task.current?.timer?.kill();
      idle.current?.kill();
      task.current = null;
      idle.current = null;
      queue.current = [];
      carried.current = null;
      reading.current = false;
    };
  }, [commandsRef]);

  // Teclado del modo piloto: flechas o WASD, Q/E (o RePág/AvPág) para subir y bajar, Espacio para agarrar/soltar.
  useEffect(() => {
    const KEYS: Record<string, PilotKey | "grab"> = {
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right",
      ArrowUp: "forward", w: "forward", W: "forward",
      ArrowDown: "back", s: "back", S: "back",
      q: "up", Q: "up", PageUp: "up",
      e: "down", E: "down", PageDown: "down",
      " ": "grab",
    };
    const typing = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      return !!n && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.tagName === "SELECT" || n.isContentEditable);
    };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (live.current.mode !== "pilot" || !live.current.active || typing(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const action = KEYS[e.key];
      if (!action) return;
      e.preventDefault();
      if (action === "grab") {
        if (down && !e.repeat) pilotGrabFn.current?.();
      } else commandsRef.current?.pilotKey(action, down);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const clear = () => Object.keys(pilotKeys.current).forEach((key) => (pilotKeys.current[key as PilotKey] = false));
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", clear);
    };
  }, [commandsRef]);

  // Pausa/reanuda al entrar o salir de pantalla; arranca al volver a estar visible.
  useEffect(() => {
    sync.current?.();
    if (active) kick.current?.();
  }, [active]);

  // Cambiar de modo: en automático retoma el ciclo; en manual deja de correr la cuenta.
  useEffect(() => {
    modeChanged.current?.();
    if (active) kick.current?.();
  }, [mode, active]);

  return { poseRef, boxRefs };
}
