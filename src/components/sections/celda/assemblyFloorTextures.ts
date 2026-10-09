import * as THREE from "three";
import { PATH_LEN, pointAt, type PathPoint } from "./assemblyPath";
import { FORK_DOOR_X, PALLET_POS, ROBOT_POS } from "./assemblyPallet";
import type { Theme } from "./assemblyTextures";

/*
 * Piso de la línea de montaje: una sola textura grande y ÚNICA para la zona
 * que se ve (no un mosaico repetido), dibujada en canvas al montar. Así cada
 * marca está en su lugar del mundo: las sendas pintadas siguen la U de la
 * cinta, las huellas de ruedas van de la puerta del autoelevador al pallet, el
 * aceite cae bajo el brazo paletizador y los charcos rodean los sumideros.
 *
 * Dos texturas:
 *  - color (2048 × 1536, ~85 px por unidad);
 *  - "rb" (1024 × 768): R = relieve (bumpMap) y G = rugosidad (roughnessMap).
 *    three lee el relieve del canal R y la rugosidad del G, así que la misma
 *    imagen sirve para las dos cosas (una textura menos).
 * Los charcos y el aceite son casi espejos (rugosidad ~0,05): reflejan las
 * luces del techo del `Environment`, que es lo que hace leer "mojado".
 */

/** Zona del mundo que cubre la textura (afuera se repite, pero ya está en la niebla). */
export const FLOOR_REGION = { x0: -12, z0: -12, w: 24, h: 18 };

/** Sumideros (centro y lado del cuadrado) — la geometría los recorta del piso. */
export const DRAINS: readonly { x: number; z: number; s: number }[] = [
  { x: -4.15, z: -2.55, s: 0.36 },
  { x: 4.3, z: -3.1, s: 0.36 },
  { x: -0.6, z: -9.0, s: 0.36 },
];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

/** Ruido de valor suave que repite sin costura (0..1), como imagen en escala de grises. */
function noiseCanvas(size: number, seed: number, cells: number, octaves: number, alpha = false) {
  const rand = rng(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const lat = Array.from({ length: n * n }, rand);
    const at = (x: number, y: number) => lat[(y % n) * n + (x % n)];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n;
        const fy = (y / size) * n;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const sx = (fx - x0) ** 2 * (3 - 2 * (fx - x0));
        const sy = (fy - y0) ** 2 * (3 - 2 * (fy - y0));
        const a = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
        const b = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
        out[y * size + x] += (a * (1 - sy) + b * sy) * amp;
      }
    total += amp;
    amp *= 0.5;
  }
  const { c, ctx } = canvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < out.length; i++) {
    const v = out[i] / total;
    if (alpha) {
      // Máscara de desgaste: transparente casi siempre, manchas opacas donde el ruido es alto.
      const a = Math.min(1, Math.max(0, (v - 0.52) * 5));
      img.data.set([0, 0, 0, a * 255], i * 4);
    } else img.data.set([v * 255, v * 255, v * 255, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

type Ctx = CanvasRenderingContext2D;

/** Pinta en las dos texturas a la vez con coordenadas del mundo. */
class Painter {
  constructor(
    public ctx: Ctx,
    public scale: number, // px por unidad
  ) {}
  X(x: number) {
    return (x - FLOOR_REGION.x0) * this.scale;
  }
  Y(z: number) {
    return (z - FLOOR_REGION.z0) * this.scale;
  }
  L(d: number) {
    return d * this.scale;
  }
  rect(x0: number, z0: number, x1: number, z1: number) {
    this.ctx.fillRect(this.X(x0), this.Y(z0), this.L(x1 - x0), this.L(z1 - z0));
  }
  /** Línea a lo largo de una lista de puntos [x, z]. */
  poly(pts: [number, number][], width: number) {
    const { ctx } = this;
    ctx.lineWidth = this.L(width);
    ctx.beginPath();
    pts.forEach(([x, z], i) => (i ? ctx.lineTo(this.X(x), this.Y(z)) : ctx.moveTo(this.X(x), this.Y(z))));
    ctx.stroke();
  }
  blob(x: number, z: number, r: number, inner: string, outer: string) {
    const { ctx } = this;
    const g = ctx.createRadialGradient(this.X(x), this.Y(z), 0, this.X(x), this.Y(z), this.L(r));
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(this.X(x - r), this.Y(z - r), this.L(r * 2), this.L(r * 2));
  }
}

// ----------------------------------------------------- trazados compartidos --

/** Línea paralela a la U de la cinta, a `offset` del eje (positivo = lado del brazo). */
function pathOffset(offset: number, from: number, to: number): [number, number][] {
  const p: PathPoint = { x: 0, z: 0, yaw: 0 };
  const pts: [number, number][] = [];
  const n = Math.ceil((to - from) / 0.1);
  for (let i = 0; i <= n; i++) {
    pointAt(from + ((to - from) * i) / n, p);
    pts.push([p.x + Math.sin(p.yaw) * offset, p.z + Math.cos(p.yaw) * offset]);
  }
  return pts;
}

/** Camino del autoelevador (mismo trazado que assemblyPallet, para pintar huellas). */
function forkPath(shift: number): [number, number][] {
  const pts: [number, number][] = [];
  const R = 1.2;
  const laneZ = PALLET_POS.z;
  for (let z = -9.6; z <= laneZ - R; z += 0.1) pts.push([FORK_DOOR_X + shift, z]);
  for (let a = 0; a <= Math.PI / 2 + 1e-6; a += Math.PI / 40) {
    pts.push([FORK_DOOR_X - R + (R + shift) * Math.cos(a), laneZ - R + (R + shift) * Math.sin(a)]);
  }
  for (let x = FORK_DOOR_X - R; x >= PALLET_POS.x + 0.6; x -= 0.1) pts.push([x, laneZ + shift]);
  return pts;
}

const U_FROM = 2.2 + 0.9; // desde la boca de entrada (DOOR_S + margen), como las franjas viejas
const U_TO = PATH_LEN - 2.2 - 0.9;

// --------------------------------------------------------------- texturas --

const PAL = {
  dark: { base: [34, 38, 40], spread: 9, joint: "#0b0d0e", patch: [44, 46, 46], rough: 175, stain: "rgba(6,5,4," },
  light: { base: [128, 133, 135], spread: 12, joint: "#4d5254", patch: [146, 148, 146], rough: 190, stain: "rgba(40,36,30," },
} as const;

const YELLOW = "#d9a400";
const WHITE = "#d7dadb";

/** Pinta las marcas de pintura (en un canvas aparte, después se gastan). */
function paintMarks(p: Painter, theme: Theme) {
  const { ctx } = p;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  // Senda de la U: amarilla, a los dos lados de la cinta.
  ctx.strokeStyle = YELLOW;
  p.poly(pathOffset(1.38, U_FROM, U_TO), 0.08);
  p.poly(pathOffset(-1.45, U_FROM, U_TO), 0.09);

  // Senda peatonal junto a la pata de entrada: borde blanco a trazos y peatones.
  ctx.strokeStyle = WHITE;
  ctx.setLineDash([p.L(0.5), p.L(0.3)]);
  p.poly([[-7.62, -9.2], [-7.62, -1.2]], 0.07);
  ctx.setLineDash([]);
  for (let z = -8.2; z < -1.5; z += 2.2) walker(p, -6.75, z, theme);

  // Carril del autoelevador: bordes blancos a trazos y flechas.
  ctx.strokeStyle = WHITE;
  ctx.setLineDash([p.L(0.4), p.L(0.25)]);
  p.poly(forkPath(0.85), 0.06);
  p.poly(forkPath(-0.85), 0.06);
  ctx.setLineDash([]);
  arrow(p, FORK_DOOR_X, -8.9, Math.PI / 2, WHITE);
  arrow(p, 0.25, PALLET_POS.z, Math.PI, WHITE);

  // Zona del brazo paletizador: círculo de alcance a trazos y franjas en el pie.
  ctx.strokeStyle = YELLOW;
  ctx.setLineDash([p.L(0.28), p.L(0.18)]);
  ctx.lineWidth = p.L(0.06);
  ctx.beginPath();
  ctx.arc(p.X(ROBOT_POS.x), p.Y(ROBOT_POS.z), p.L(2.35), Math.PI * 0.08, Math.PI * 1.12, true);
  ctx.stroke();
  ctx.setLineDash([]);
  hatchDisc(p, ROBOT_POS.x, ROBOT_POS.z, 0.62, 0.86);
  // Lugar del pallet: escuadras blancas en las esquinas.
  ctx.strokeStyle = WHITE;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = PALLET_POS.x + sx * 0.58;
    const cz = PALLET_POS.z + sz * 0.58;
    p.poly([[cx - sx * 0.25, cz], [cx, cz], [cx, cz - sz * 0.25]], 0.05);
  }
  // Pallets vacíos apilados junto a la puerta: rectángulo amarillo.
  ctx.strokeStyle = YELLOW;
  ctx.strokeRect(p.X(-0.35), p.Y(-9.45), p.L(1.2), p.L(1.0));

  // Flechas de sentido de la cinta, sobre el piso junto a la U.
  const pt: PathPoint = { x: 0, z: 0, yaw: 0 };
  // En las patas, del lado de adentro; en el tramo frontal, detrás (adelante está la rejilla).
  for (const [s, off] of [[4.2, 1.1], [9.4, -1.12], [13.4, -1.12], [19.6, 1.1]]) {
    pointAt(s, pt);
    arrow(p, pt.x + Math.sin(pt.yaw) * off, pt.z + Math.cos(pt.yaw) * off, -pt.yaw, YELLOW, 0.5);
  }

  // Rótulos pintados.
  stencil(p, "LINEA 01", -3.0, -3.0, 0, 0.32, YELLOW);
  stencil(p, "PALLETS", FORK_DOOR_X + 0.05, -7.55, 0, 0.3, WHITE);
  stencil(p, "PEATONES", -6.75, -7.1, -Math.PI / 2, 0.26, WHITE);
}

/** Figura de peatón pintada (círculo + cuerpo), mirando a −Z. */
function walker(p: Painter, x: number, z: number, theme: Theme) {
  const { ctx } = p;
  ctx.fillStyle = theme === "dark" ? "#c9cdcf" : "#eef0f1";
  ctx.beginPath();
  ctx.arc(p.X(x), p.Y(z - 0.3), p.L(0.07), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineCap = "round";
  p.poly([[x, z - 0.2], [x, z + 0.05]], 0.06);
  p.poly([[x, z + 0.05], [x - 0.09, z + 0.28]], 0.05);
  p.poly([[x, z + 0.05], [x + 0.08, z + 0.27]], 0.05);
  p.poly([[x - 0.12, z - 0.02], [x, z - 0.16], [x + 0.12, z - 0.06]], 0.045);
  ctx.lineCap = "butt";
}

/** Flecha pintada (punta hacia `ang`, medida desde +X hacia +Z en el piso). */
function arrow(p: Painter, x: number, z: number, ang: number, color: string, size = 0.7) {
  const { ctx } = p;
  ctx.save();
  ctx.translate(p.X(x), p.Y(z));
  ctx.rotate(ang);
  ctx.fillStyle = color;
  const s = p.L(size);
  ctx.beginPath();
  ctx.moveTo(s * 0.5, 0);
  ctx.lineTo(s * 0.05, -s * 0.28);
  ctx.lineTo(s * 0.05, -s * 0.11);
  ctx.lineTo(-s * 0.5, -s * 0.11);
  ctx.lineTo(-s * 0.5, s * 0.11);
  ctx.lineTo(s * 0.05, s * 0.11);
  ctx.lineTo(s * 0.05, s * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Texto de plantilla pintado en el piso. */
function stencil(p: Painter, text: string, x: number, z: number, ang: number, h: number, color: string) {
  const { ctx } = p;
  ctx.save();
  ctx.translate(p.X(x), p.Y(z));
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.font = `800 ${p.L(h)}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Anillo con franjas de peligro (pie del brazo paletizador). */
function hatchDisc(p: Painter, x: number, z: number, r0: number, r1: number) {
  const { ctx } = p;
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.X(x), p.Y(z), p.L(r1), 0, Math.PI * 2);
  ctx.arc(p.X(x), p.Y(z), p.L(r0), 0, Math.PI * 2, true);
  ctx.clip();
  ctx.fillStyle = "#111213";
  ctx.fillRect(p.X(x - r1), p.Y(z - r1), p.L(r1 * 2), p.L(r1 * 2));
  ctx.fillStyle = YELLOW;
  const step = p.L(0.16);
  ctx.translate(p.X(x), p.Y(z));
  ctx.rotate(Math.PI / 4);
  for (let k = -p.L(r1) * 1.5; k < p.L(r1) * 1.5; k += step * 2) ctx.fillRect(k, -p.L(r1) * 1.5, step, p.L(r1) * 3);
  ctx.restore();
}

/** Mancha irregular: varias gotas superpuestas alrededor de (x, z). */
function splat(rand: () => number, x: number, z: number, r: number, fill: (px: number, pz: number, pr: number) => void) {
  const n = 4 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * r * 0.6;
    fill(x + Math.cos(a) * d, z + Math.sin(a) * d * 0.8, r * (0.35 + rand() * 0.5));
  }
}

type Stain = { kind: "oil" | "puddle"; x: number; z: number; r: number; seed: number };

/** Charcos y aceite: dónde caen tiene sentido (sumideros, máquinas, autoelevador). */
const STAINS: Stain[] = [
  { kind: "puddle", x: -4.0, z: -2.35, r: 0.75, seed: 1 },
  { kind: "puddle", x: 4.15, z: -2.85, r: 0.6, seed: 2 },
  { kind: "puddle", x: -0.4, z: -8.7, r: 0.55, seed: 3 },
  { kind: "puddle", x: -5.0, z: 0.9, r: 0.5, seed: 4 },
  { kind: "oil", x: ROBOT_POS.x + 0.8, z: ROBOT_POS.z + 0.35, r: 0.3, seed: 5 },
  { kind: "oil", x: 0.9, z: -8.3, r: 0.45, seed: 6 },
  { kind: "oil", x: 2.9, z: -4.0, r: 0.28, seed: 7 },
  { kind: "oil", x: -3.6, z: -4.1, r: 0.22, seed: 8 },
  { kind: "oil", x: 3.6, z: 2.4, r: 0.3, seed: 9 },
  { kind: "oil", x: -5.6, z: -2.0, r: 0.25, seed: 10 },
];

export function floorTextures(theme: Theme) {
  const pal = PAL[theme];
  const { x0, z0, w, h } = FLOOR_REGION;
  const S = 2048 / w;
  const W = 2048;
  const H = Math.round(h * S);
  const rand = rng(41);

  // ---- color
  const { c, ctx } = canvas(W, H);
  const p = new Painter(ctx, S);
  // Losas de 3 × 3 con tono propio (hormigón de distintas coladas).
  const slab = 3;
  for (let sx = x0; sx < x0 + w; sx += slab)
    for (let sz = z0; sz < z0 + h; sz += slab) {
      const k = (rand() - 0.5) * pal.spread;
      ctx.fillStyle = `rgb(${pal.base[0] + k},${pal.base[1] + k},${pal.base[2] + k * 0.9})`;
      p.rect(sx, sz, sx + slab, sz + slab);
    }
  // Manchas de ruido grandes (multiplica) y grano de árido.
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = theme === "dark" ? 0.55 : 0.35;
  const big = noiseCanvas(256, 7, 4, 5);
  ctx.drawImage(big, 0, 0, W, H);
  ctx.globalAlpha = 0.35;
  const fine = noiseCanvas(128, 8, 8, 3);
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(fine, x, y, 256, 256);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  for (let i = 0; i < 60000; i++) {
    const v = rand() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${(theme === "dark" ? 0.05 : 0.07) * rand()})`;
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
  }
  // Marcas de llana (arcos muy tenues).
  ctx.lineWidth = 2;
  for (let i = 0; i < 160; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.012 + rand() * 0.02})`;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, 40 + rand() * 200, rand() * 6, rand() * 6 + 1.2);
    ctx.stroke();
  }

  // Reparaciones: parches de hormigón nuevo con borde cortado.
  const patches: [number, number, number, number][] = [
    [-5.4, -1.1, -4.3, 0.2],
    [5.0, -2.2, 5.9, -1.4],
    [-2.0, -7.6, -0.9, -7.0],
    [5.9, 0.4, 7.2, 1.3],
    [-9.4, -5.6, -8.4, -4.4],
    [3.6, -9.3, 4.6, -8.5],
  ];
  for (const [ax, az, bx, bz] of patches) {
    ctx.fillStyle = `rgba(${pal.patch[0]},${pal.patch[1]},${pal.patch[2]},0.85)`;
    p.rect(ax, az, bx, bz);
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.X(ax), p.Y(az), p.L(bx - ax), p.L(bz - az));
  }

  // Juntas de dilatación (corte de sierra) y esquinas descascaradas.
  ctx.fillStyle = pal.joint;
  for (let x = x0; x <= x0 + w; x += slab) ctx.fillRect(p.X(x) - 2, 0, 4, H);
  for (let z = z0; z <= z0 + h; z += slab) ctx.fillRect(0, p.Y(z) - 2, W, 4);
  for (let x = x0; x <= x0 + w; x += slab)
    for (let z = z0; z <= z0 + h; z += slab) {
      if (rand() < 0.5) continue;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(p.X(x) + (rand() - 0.5) * 8, p.Y(z) + (rand() - 0.5) * 8, 4 + rand() * 7, 3 + rand() * 5, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  // Fisuras: caminatas al azar finas.
  const cracks: [number, number][][] = [];
  for (let i = 0; i < 14; i++) {
    let x = x0 + rand() * w;
    let z = z0 + rand() * h;
    let a = rand() * Math.PI * 2;
    const pts: [number, number][] = [[x, z]];
    const n = 8 + Math.floor(rand() * 14);
    for (let j = 0; j < n; j++) {
      a += (rand() - 0.5) * 0.9;
      x += Math.cos(a) * 0.12;
      z += Math.sin(a) * 0.12;
      pts.push([x, z]);
    }
    cracks.push(pts);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  for (const pts of cracks) p.poly(pts, 0.012);

  // Huellas de ruedas (autoelevador y zorras): bandas oscuras gastadas.
  const tracks: [number, number][][] = [];
  for (const sh of [-0.42, 0.42, -0.38, 0.47]) tracks.push(forkPath(sh));
  tracks.push(pathOffset(-0.95, 1.0, 7.5).map(([x, z]) => [x - 1.2, z] as [number, number]));
  tracks.push([[-8.4, -7.6], [-8.0, -6.2], [-7.2, -4.4], [-6.0, -2.9], [-5.6, -1.5]]);
  tracks.push([[-7.6, -7.7], [-7.3, -6.3], [-6.6, -4.6]]);
  tracks.push([[7.4, -7.5], [7.0, -5.8], [6.2, -4.3], [5.0, -3.0]]);
  ctx.lineCap = "round";
  tracks.forEach((pts, i) => {
    ctx.strokeStyle = theme === "dark" ? `rgba(4,4,4,${0.16 + (i % 3) * 0.05})` : `rgba(20,20,20,${0.12 + (i % 3) * 0.04})`;
    p.poly(pts, 0.11);
  });
  ctx.lineCap = "butt";

  // Pintura: capa aparte que después se gasta con una máscara de ruido.
  const paint = canvas(W, H);
  const pp = new Painter(paint.ctx, S);
  paintMarks(pp, theme);
  paint.ctx.globalCompositeOperation = "destination-out";
  const wear = noiseCanvas(256, 19, 8, 4, true);
  for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) paint.ctx.drawImage(wear, x, y, 512, 512);
  // Rayones de ruedas sobre la pintura.
  paint.ctx.strokeStyle = "rgba(0,0,0,0.8)";
  for (const pts of tracks) pp.poly(pts, 0.05);
  paint.ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = theme === "dark" ? 0.82 : 0.9;
  ctx.drawImage(paint.c, 0, 0);
  ctx.globalAlpha = 1;

  // Aceite y charcos (encima de todo: mojan también la pintura).
  for (const st of STAINS) {
    const r2 = rng(st.seed * 97);
    if (st.kind === "oil") {
      splat(r2, st.x, st.z, st.r, (x, z, r) => p.blob(x, z, r, `${pal.stain}0.55)`, `${pal.stain}0)`));
      // gotas sueltas
      for (let i = 0; i < 6; i++) p.blob(st.x + (r2() - 0.5) * st.r * 3, st.z + (r2() - 0.5) * st.r * 3, 0.03 + r2() * 0.04, `${pal.stain}0.6)`, `${pal.stain}0)`);
    } else {
      splat(r2, st.x, st.z, st.r, (x, z, r) => p.blob(x, z, r, theme === "dark" ? "rgba(8,10,12,0.32)" : "rgba(60,66,70,0.35)", "rgba(0,0,0,0)"));
    }
  }
  // Óxido que chorrea alrededor de los sumideros.
  for (const d of DRAINS) p.blob(d.x, d.z, d.s * 1.2, "rgba(70,38,16,0.35)", "rgba(70,38,16,0)");

  // ---- relieve (R) y rugosidad (G)
  const RS = 0.5;
  const hgt = canvas(W * RS, H * RS);
  const rgh = canvas(W * RS, H * RS);
  const ph = new Painter(hgt.ctx, S * RS);
  const pr = new Painter(rgh.ctx, S * RS);
  hgt.ctx.fillStyle = "rgb(128,128,128)";
  hgt.ctx.fillRect(0, 0, W * RS, H * RS);
  hgt.ctx.globalAlpha = 0.25;
  hgt.ctx.drawImage(noiseCanvas(128, 31, 16, 3), 0, 0, W * RS, H * RS);
  hgt.ctx.globalAlpha = 1;
  hgt.ctx.fillStyle = "rgb(30,30,30)";
  for (let x = x0; x <= x0 + w; x += slab) hgt.ctx.fillRect(ph.X(x) - 1.5, 0, 3, H * RS);
  for (let z = z0; z <= z0 + h; z += slab) hgt.ctx.fillRect(0, ph.Y(z) - 1.5, W * RS, 3);
  hgt.ctx.strokeStyle = "rgb(70,70,70)";
  for (const pts of cracks) ph.poly(pts, 0.02);
  for (const [ax, az, bx, bz] of patches) {
    hgt.ctx.strokeStyle = "rgb(60,60,60)";
    hgt.ctx.lineWidth = 2;
    hgt.ctx.strokeRect(ph.X(ax), ph.Y(az), ph.L(bx - ax), ph.L(bz - az));
  }
  // La pintura es una capa: un poco más alta (sus bordes dan brillo).
  hgt.ctx.globalAlpha = 0.25;
  hgt.ctx.drawImage(paint.c, 0, 0, W * RS, H * RS);
  hgt.ctx.globalAlpha = 1;

  // Rugosidad: base + manchas pulidas/polvorientas + pintura algo más lisa.
  rgh.ctx.fillStyle = `rgb(${pal.rough},${pal.rough},${pal.rough})`;
  rgh.ctx.fillRect(0, 0, W * RS, H * RS);
  rgh.ctx.globalCompositeOperation = "overlay";
  rgh.ctx.drawImage(noiseCanvas(256, 53, 4, 4), 0, 0, W * RS, H * RS);
  rgh.ctx.globalCompositeOperation = "source-over";
  rgh.ctx.globalAlpha = 0.5;
  const paintMask = canvas(W * RS, H * RS);
  paintMask.ctx.drawImage(paint.c, 0, 0, W * RS, H * RS);
  paintMask.ctx.globalCompositeOperation = "source-in";
  paintMask.ctx.fillStyle = "rgb(105,105,105)";
  paintMask.ctx.fillRect(0, 0, W * RS, H * RS);
  rgh.ctx.drawImage(paintMask.c, 0, 0);
  rgh.ctx.globalAlpha = 1;
  // Huellas: goma pulida.
  rgh.ctx.lineCap = "round";
  rgh.ctx.strokeStyle = "rgba(90,90,90,0.35)";
  for (const pts of tracks) pr.poly(pts, 0.12);
  for (const st of STAINS) {
    const r2 = rng(st.seed * 97);
    const v = st.kind === "oil" ? 45 : 10;
    splat(r2, st.x, st.z, st.r, (x, z, r) => pr.blob(x, z, r * 1.1, `rgba(${v},${v},${v},1)`, `rgba(${v},${v},${v},0)`));
  }

  // Junta R (relieve) y G (rugosidad) en una sola imagen.
  const out = canvas(W * RS, H * RS);
  const a = hgt.ctx.getImageData(0, 0, W * RS, H * RS).data;
  const b = rgh.ctx.getImageData(0, 0, W * RS, H * RS).data;
  const img = out.ctx.createImageData(W * RS, H * RS);
  for (let i = 0; i < a.length; i += 4) {
    img.data[i] = a[i];
    img.data[i + 1] = b[i + 1];
    img.data[i + 2] = 0;
    img.data[i + 3] = 255;
  }
  out.ctx.putImageData(img, 0, 0);

  const map = worldTexture(c, true);
  const rb = worldTexture(out.c, false);
  return { map, rb };
}

/**
 * Textura mapeada al mundo: la geometría del piso usa uv = (x, −z) (ver
 * AssemblyFloor) y acá se lleva la región FLOOR_REGION a 0..1.
 */
function worldTexture(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  const { x0, z0, w, h } = FLOOR_REGION;
  t.repeat.set(1 / w, 1 / h);
  t.offset.set(-x0 / w, 1 + z0 / h);
  return t;
}

// ------------------------------------------------------ texturas de piezas --

/** Rejilla electrosoldada: barras portantes y transversales; los huecos son transparentes. */
export function gratingTexture() {
  const s = 128;
  const { c, ctx } = canvas(s, s);
  ctx.clearRect(0, 0, s, s);
  const bar = (x: number, y: number, w: number, h: number, light: string, dark: string) => {
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = light;
    ctx.fillRect(x, y, w > h ? w : Math.max(1, w * 0.4), w > h ? Math.max(1, h * 0.4) : h);
  };
  // portantes cada 16 px (gruesas), transversales cada 32 px (finas, retorcidas)
  for (let x = 0; x < s; x += 16) bar(x, 0, 5, s, "#9aa1a5", "#4c5357");
  for (let y = 8; y < s; y += 32) bar(0, y, s, 3, "#8d9498", "#3f4548");
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Chapa semillada (lagrimal): color y relieve. */
export function treadTextures() {
  const s = 128;
  const col = canvas(s, s);
  const bump = canvas(s, s);
  col.ctx.fillStyle = "#c8cdd0";
  col.ctx.fillRect(0, 0, s, s);
  bump.ctx.fillStyle = "rgb(60,60,60)";
  bump.ctx.fillRect(0, 0, s, s);
  const rand = rng(77);
  for (let i = 0; i < 600; i++) {
    const v = 170 + rand() * 60;
    col.ctx.fillStyle = `rgba(${v},${v},${v},0.25)`;
    col.ctx.fillRect(rand() * s, rand() * s, 2, 2);
  }
  // Lágrimas en espiga: alternan 45° y −45°.
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++) {
      const x = i * 32 + (j % 2) * 16 + 8;
      const y = j * 32 + 16;
      const ang = (i + j) % 2 ? Math.PI / 4 : -Math.PI / 4;
      for (const [ctx, fill] of [[col.ctx, "rgba(255,255,255,0.35)"], [bump.ctx, "rgb(235,235,235)"]] as const) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  const make = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: make(col.c, true), bump: make(bump.c, false) };
}

/** Trazos de luz para el aro perimetral (se animan corriendo el offset). */
export function chaseTexture() {
  const { c, ctx } = canvas(256, 8);
  for (let i = 0; i < 256; i++) {
    const k = (i % 32) / 32;
    const v = k < 0.55 ? 0.35 + 0.65 * Math.sin((k / 0.55) * Math.PI) : 0.12;
    ctx.fillStyle = `rgba(255,255,255,${v})`;
    ctx.fillRect(i, 0, 1, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
