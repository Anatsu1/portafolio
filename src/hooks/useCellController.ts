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
  slotOf,
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

export type CellMode = "auto" | "manual";

// Solo en desarrollo: `?nolag` hace que las animaciones sigan el reloj real
// aunque el render sea lento (navegador headless con GPU por software). GSAP
// por defecto "suaviza" los cuadros largos y las pruebas automáticas corrían
// a cámara lenta. En producción este bloque no existe.
if (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nolag")) {
  gsap.ticker.lagSmoothing(0);
}

/** Comandos que la interfaz (botones, clic en cajas, panel) le manda al controlador. */
export type CellCommands = {
  /** Trae la caja `index` a la plataforma (si ya está en cola o en curso, no hace nada). */
  show: (index: number) => void;
  /** Cierra el panel y devuelve la caja a su lugar. */
  release: () => void;
  /** Congela o reanuda la espera del panel (mientras el visitante lo lee). */
  holdPause: (paused: boolean) => void;
};

type ControllerOptions = {
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

export function useCellController({ count, active, mode, onShowing, onDelivered, commandsRef, openRefs }: ControllerOptions) {
  const poseRef = useRef<ArmPose>({ yaw: HOME.phi, shoulder: 0.5, elbow: -1.1, grip: 0.6 });
  const boxRefs = useRef<(Group | null)[]>([]);
  const reach = useRef<ReachTarget>({ ...HOME });
  const carried = useRef<Group | null>(null);

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

  useFrame(() => {
    solveIK(reach.current, poseRef.current);
    const box = carried.current;
    if (box) {
      const [x, y, z] = cartesian(reach.current, reach.current.y);
      box.position.set(x, y, z);
      box.rotation.y = facingOutward(reach.current.phi);
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
        const back = nearestAngle(box.rotation.y, facingOutward(DELIVERY.phi));
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
        box.rotation.y = facingOutward(to.phi);
      }
      carried.current = null;
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

      const tl = gsap.timeline({ onComplete: finish });
      tl.to({}, { duration: 1.4 }); // se cierra la tapa y la caja recupera su tamaño
      pickAndPlace(tl, t.index, DELIVERY, slotOf(t.index));
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
        const slot = slotOf(t.index);
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
      if (!isActive) return;

      let index = queue.current.shift();
      if (index === undefined && m === "auto") index = cursor.current++ % n;
      if (index === undefined) {
        if (!idle.current) goHome();
        return;
      }

      idle.current?.kill();
      idle.current = null;

      const slot = slotOf(index);
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
    };

    kick.current = next;
    modeChanged.current = () => {
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
      (window as unknown as { __cellDebug?: () => unknown }).__cellDebug = () => ({
        task: task.current && {
          index: task.current.index,
          phase: task.current.phase,
          timer: !!task.current.timer,
          showcased: !!task.current.showcased,
          released: !!task.current.released,
        },
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
