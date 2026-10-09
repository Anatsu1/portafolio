import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CELL_BOXES } from "../../../data/cell";
import type { ArmRig } from "./ArmSvg";
import { nearestAngle, prefersReducedMotion, project, solveArm, type ArmPoints, type Reach, type View } from "./arm2d";

/**
 * Geometría y controlador del laboratorio 2D (`MobileLab`).
 *
 * Es un port de `useCellController` (el del 3D) sin three: la misma cola de
 * "mostrar caja N", las mismas tres fases (ir → espera → volver), el mismo
 * ritmo (`BASE_SPEED`, nunca se acelera) y la misma regla de que sólo vale el
 * último pedido. La diferencia es que acá se dibuja en SVG: en cada cuadro se
 * resuelve la IK 2D y se escriben atributos, sin re-render de React.
 */

// ── Escena (se ve la franja y = 40…420 de un lienzo de 360 de ancho) ────────────────────────────────────────────
export const SCENE_W = 360;
export const SCENE_H = 420;
/** Desde dónde se muestra la escena (lo de más arriba quedaba vacío). */
export const SCENE_TOP = 40;
export const VIEW: View = { cx: 180, floorY: 352, depth: 0.32 };
export const DIMS = { shoulder: 150, l1: 100, l2: 100 };
/** Radio del arco de cajas alrededor de la base (como `ARC_RADIUS` del 3D). */
export const RING = 150;
export const BOX_W = 60;
export const BOX_H = 52;
/** De la muñeca a la tapa de la caja agarrada (lo que miden el bloque y los dedos). */
export const GRIP_GAP = 12;
/** Altura de la plataforma de entrega y su posición en el arco (atrás a la derecha). */
export const PAD_H = 120;
export const PAD_PHI = (-40 * Math.PI) / 180;
/** Cuánto crece la caja mostrada (en el 3D es 2,4; en 2D, con más, tapaba el brazo). */
export const SHOWCASE_SCALE = 1.3;

const GRASP_Y = BOX_H + GRIP_GAP;
const HOVER_Y = 212; // por encima de todo, incluida la plataforma con una caja colgando
const PAD_GRASP_Y = PAD_H + GRASP_Y;
const GRIP_OPEN = 1;
const GRIP_CLOSED = 0.15;
/** Igual que el 3D: un poco más rápido que la coreografía original y sin acelerar jamás. */
const BASE_SPEED = 1.25;
/** Segundos que queda mostrada una caja en automático (no abre la hoja: ver MobileLab). */
const HOLD_AUTO_S = 5;
/** Pose de descanso: arriba y atrás a la izquierda, lejos de la plataforma. */
const HOME: Reach = { phi: (-140 * Math.PI) / 180, r: 96, y: 236 };

type Polar = { phi: number; r: number };

/**
 * Las cajas se reparten con separación PAREJA en pantalla (no en ángulo): con
 * ángulos parejos las de los costados se amontonaban y los rótulos chocaban.
 */
export function slotOf(index: number): Polar {
  const n = CELL_BOXES.length;
  const dx = ((index - (n - 1) / 2) / ((n - 1) / 2)) * 144;
  return { phi: Math.acos(dx / RING), r: RING };
}
export const PAD: Polar = { phi: PAD_PHI, r: RING };

/** Centro de la base de una caja apoyada en `p`, a la altura `y`. */
export function bottomOf(p: Polar, y = 0) {
  return project(VIEW, p.phi, p.r, y);
}

export type LabMode = "auto" | "manual";

/** Estado de dibujo de cada caja (lo anima GSAP, lo lee `render`). */
type BoxState = { carried: boolean; x: number; y: number; scale: number; lid: number };

type Phase = "ir" | "espera" | "volver";
type Task = { index: number; phase: Phase; tl: gsap.core.Timeline | null; timer: gsap.core.Tween | null };

export function useMobileLab(active: boolean) {
  const reduced = useRef(prefersReducedMotion()).current;
  // Con movimiento reducido no hay ciclo automático: nada se mueve si no se pide.
  const [mode, setMode] = useState<LabMode>(reduced ? "manual" : "auto");
  const [showing, setShowing] = useState<number | null>(null);
  const [delivered, setDelivered] = useState<number | null>(null);

  const rigRef = useRef<ArmRig | null>(null);
  const boxRefs = useRef<(SVGGElement | null)[]>([]);
  const lidRefs = useRef<(SVGGElement | null)[]>([]);
  const glowRefs = useRef<(SVGGElement | null)[]>([]);

  const live = useRef({ active, mode });
  live.current = { active, mode };
  const api = useRef<{ show: (i: number) => void; release: () => void; holdPause: (p: boolean) => void } | null>(null);
  const kick = useRef<(() => void) | null>(null);
  const sync = useRef<(() => void) | null>(null);
  const modeChanged = useRef<(() => void) | null>(null);

  useEffect(() => {
    const target: Reach = { ...HOME };
    const grip = { grip: 0.6 };
    const pts: ArmPoints = { shoulder: { x: 0, y: 0 }, elbow: { x: 0, y: 0 }, wrist: { x: 0, y: 0 } };
    const boxes: BoxState[] = CELL_BOXES.map((_, i) => {
      const b = bottomOf(slotOf(i));
      return { carried: false, x: b.x, y: b.y, scale: 1, lid: 0 };
    });
    const queue: number[] = [];
    let task: Task | null = null;
    let idle: gsap.core.Timeline | null = null;
    let cursor = 0;
    let reading = false;
    /**
     * Cerraron la hoja mientras el brazo todavía se apartaba (fase "ir"): la
     * hoja se abre apenas la caja toca la plataforma, así que eso pasa. Se
     * recuerda y se devuelve la caja al entrar en espera; si no, el cierre se
     * perdía y la hoja seguía abierta.
     */
    let releaseAsked = false;
    const d = (s: number) => (reduced ? 0 : s / BASE_SPEED); // tweens sueltos (fuera de timelines)

    const render = () => {
      solveArm(VIEW, DIMS, target, pts);
      rigRef.current?.draw(pts, grip.grip);
      boxes.forEach((b, i) => {
        if (b.carried) {
          b.x = pts.wrist.x;
          b.y = pts.wrist.y + GRIP_GAP + BOX_H;
        }
        boxRefs.current[i]?.setAttribute(
          "transform",
          `translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) scale(${b.scale.toFixed(3)})`
        );
        // La tapa gira sobre su bisagra izquierda.
        lidRefs.current[i]?.setAttribute("transform", `rotate(${(-110 * b.lid).toFixed(1)} ${-BOX_W / 2} ${-BOX_H})`);
        glowRefs.current[i]?.setAttribute("opacity", b.lid.toFixed(3));
      });
    };
    // Fuera de pantalla no se dibuja (y las líneas de tiempo están en pausa).
    const tick = () => {
      if (live.current.active) render();
    };
    gsap.ticker.add(tick);
    render();

    const applyPause = () => {
      const off = !live.current.active;
      idle?.paused(off);
      if (!task) return;
      task.tl?.paused(off);
      task.timer?.paused(off || reading);
    };
    sync.current = applyPause;

    /** En la plataforma la caja crece y abre la tapa; al terminar, cierra y vuelve a su tamaño. */
    const showcase = (index: number, on: boolean) => {
      const b = boxes[index];
      gsap.killTweensOf(b);
      if (on) {
        gsap.to(b, { scale: SHOWCASE_SCALE, duration: d(0.8), ease: "back.out(1.6)" });
        gsap.to(b, { lid: 1, duration: d(0.5), delay: d(0.7), ease: "power2.out" });
      } else {
        gsap.to(b, { lid: 0, duration: d(0.35), ease: "power2.in" });
        gsap.to(b, { scale: 1, duration: d(0.6), delay: d(0.6), ease: "power2.inOut" });
      }
    };

    let marks = 0;
    /** Misma coreografía que el 3D: viaje en alto, baja abriendo, cierra, sube girando, apoya, suelta y se retira. */
    const pickAndPlace = (tl: gsap.core.Timeline, index: number, from: Polar, fromY: number, to: Polar, toY: number) => {
      const label = (name: string, position: string) => {
        const id = `${name}-${marks++}`;
        tl.addLabel(id, position);
        return id;
      };
      tl.to(target, { phi: () => nearestAngle(target.phi, from.phi), r: from.r, y: HOVER_Y, duration: 1.4, ease: "power2.inOut" });
      tl.to(grip, { grip: 0.5, duration: 0.9, ease: "sine.inOut" }, "<0.1");

      const down = label("bajar", "-=0.25");
      tl.to(target, { y: fromY, duration: 0.85, ease: "power2.inOut" }, down);
      tl.to(grip, { grip: GRIP_OPEN, duration: 0.55, ease: "power2.out" }, `${down}-=0.3`);

      tl.to(grip, { grip: GRIP_CLOSED, duration: 0.5, ease: "power2.inOut" }, "-=0.05");
      tl.call(() => {
        boxes[index].carried = true;
      });

      const up = label("subir", "+=0.05");
      tl.to(target, { y: HOVER_Y, duration: 0.75, ease: "power2.inOut" }, up);
      tl.to(target, { phi: () => nearestAngle(target.phi, to.phi), r: to.r, duration: 1.6, ease: "power2.inOut" }, `${up}+=0.35`);

      const place = label("apoyar", "-=0.3");
      tl.to(target, { y: toY, duration: 0.85, ease: "power2.inOut" }, place);
      tl.to(grip, { grip: GRIP_OPEN, duration: 0.5, ease: "power2.out" }, "-=0.05");
      tl.call(() => {
        // Queda apoyada exactamente donde la soltó (la cuenta sale de la misma proyección).
        const b = bottomOf(to, toY - GRASP_Y);
        Object.assign(boxes[index], { carried: false, x: b.x, y: b.y });
      });

      tl.to(target, { y: HOVER_Y, duration: 0.7, ease: "power2.inOut" }, "<0.2");
      tl.to(grip, { grip: 0.5, duration: 0.7, ease: "sine.inOut" }, "<");
    };

    const timeline = (onComplete: () => void) => {
      const tl = gsap.timeline({ onComplete });
      // Con movimiento reducido se resuelve todo "de golpe": la caja aparece abierta.
      tl.timeScale(reduced ? 1000 : BASE_SPEED);
      return tl;
    };

    const goHome = () => {
      const tl = timeline(() => {});
      tl.to(target, { phi: () => nearestAngle(target.phi, HOME.phi), r: HOME.r, y: HOME.y, duration: 1.4, ease: "power2.inOut" });
      tl.to(grip, { grip: 0.6, duration: 0.4 }, "<");
      idle = tl;
      applyPause();
    };

    const finish = () => {
      task = null;
      setShowing(null);
      next();
    };

    const endHold = () => {
      const t = task;
      if (!t || t.phase !== "espera") return;
      t.timer?.kill();
      t.timer = null;
      reading = false;
      t.phase = "volver";
      showcase(t.index, false);
      setDelivered(null);
      const tl = timeline(finish);
      tl.to({}, { duration: 1.2 }); // se cierra la tapa y la caja recupera su tamaño
      pickAndPlace(tl, t.index, PAD, PAD_GRASP_Y, slotOf(t.index), GRASP_Y);
      t.tl = tl;
      applyPause();
    };

    const enterHold = () => {
      const t = task;
      if (!t) return;
      t.phase = "espera";
      t.tl = null;
      if (queue.length > 0 || releaseAsked) {
        endHold(); // ya pidió otra (o cerró la hoja): no hace falta esperar
        return;
      }
      if (live.current.mode === "auto") t.timer = gsap.delayedCall(HOLD_AUTO_S, endHold);
      applyPause();
    };

    const next = () => {
      if (task) return;
      if (!live.current.active) return;
      let index = queue.shift();
      if (index === undefined && live.current.mode === "auto") index = cursor++ % CELL_BOXES.length;
      if (index === undefined) {
        if (!idle) goHome();
        return;
      }
      idle?.kill();
      idle = null;
      releaseAsked = false;
      const i = index;
      const tl = timeline(enterHold);
      pickAndPlace(tl, i, slotOf(i), GRASP_Y, PAD, PAD_GRASP_Y);
      tl.call(() => {
        // Si mientras viajaba pidieron otra, no se abre: se devuelve enseguida.
        if (queue.length > 0) return;
        showcase(i, true);
        setDelivered(i);
      });
      tl.to(target, { phi: () => nearestAngle(target.phi, HOME.phi), r: HOME.r, y: HOME.y, duration: 1.3, ease: "power2.inOut" });
      tl.to(grip, { grip: 0.6, duration: 0.4 }, "<");
      task = { index: i, phase: "ir", tl, timer: null };
      setShowing(i);
      applyPause();
    };

    api.current = {
      show: (index) => {
        const t = task;
        if (t && t.index === index && t.phase !== "volver") return;
        // Sólo importa lo último que se pidió: no se arma una fila.
        queue.length = 0;
        queue.push(index);
        if (t) {
          if (t.phase === "espera") endHold();
        } else {
          next();
        }
      },
      release: () => {
        if (task?.phase === "ir") {
          releaseAsked = true;
          setDelivered(null);
        } else endHold();
      },
      holdPause: (paused) => {
        reading = paused;
        applyPause();
      },
    };
    kick.current = next;
    modeChanged.current = () => {
      const t = task;
      if (!t || t.phase !== "espera") return;
      if (live.current.mode === "manual") {
        t.timer?.kill();
        t.timer = null;
      } else if (!t.timer) {
        endHold();
      }
    };

    if (import.meta.env.DEV) {
      (window as unknown as { __labDebug?: () => unknown }).__labDebug = () => ({
        task: task && { index: task.index, phase: task.phase },
        queue: [...queue],
        mode: live.current.mode,
        active: live.current.active,
      });
    }

    return () => {
      gsap.ticker.remove(tick);
      task?.tl?.kill();
      task?.timer?.kill();
      idle?.kill();
      boxes.forEach((b) => gsap.killTweensOf(b));
      api.current = null;
      kick.current = null;
      sync.current = null;
      modeChanged.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    sync.current?.();
    if (active) kick.current?.();
  }, [active]);

  useEffect(() => {
    modeChanged.current?.();
    if (active) kick.current?.();
  }, [mode, active]);

  /** Pedido del visitante (toque en una caja o botón): pasa a manual, como en el 3D. */
  const pick = useCallback((index: number) => {
    live.current.mode = "manual"; // que `show` ya vea el modo nuevo antes del re-render
    setMode("manual");
    api.current?.show(index);
  }, []);
  const release = useCallback(() => api.current?.release(), []);
  const holdPause = useCallback((p: boolean) => api.current?.holdPause(p), []);

  return { mode, setMode, showing, delivered, pick, release, holdPause, rigRef, boxRefs, lidRefs, glowRefs, reduced };
}
