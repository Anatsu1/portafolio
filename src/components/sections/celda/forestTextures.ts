import * as THREE from "three";
import { rng } from "./forestScatter";

/**
 * Texturas procedurales del bosque (canvas 2D, sin descargas). Se generan una
 * sola vez al montar el entorno; todas son chicas (≤ 512 px) y repetibles.
 */

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function toTexture(canvas: HTMLCanvasElement, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Dibuja `fn` también desplazado un período, para que el patrón sea repetible. */
function wrapDraw(w: number, h: number, x: number, y: number, pad: number, fn: (x: number, y: number) => void) {
  for (const dx of [0, -w, w]) {
    for (const dy of [0, -h, h]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx > -pad && nx < w + pad && ny > -pad && ny < h + pad) fn(nx, ny);
    }
  }
}

const pick = <T,>(rand: () => number, list: readonly T[]) => list[Math.floor(rand() * list.length)];

/** Manchas difusas (radiales) repetibles: base de casi todos los suelos. */
function blotches(ctx: CanvasRenderingContext2D, size: number, rand: () => number, count: number, rMin: number, rMax: number, colors: readonly string[]) {
  for (let i = 0; i < count; i++) {
    const r = rMin + rand() * (rMax - rMin);
    const color = pick(rand, colors);
    wrapDraw(size, size, rand() * size, rand() * size, rMax, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    });
  }
}

/**
 * Corteza de árbol de hoja ancha: gris pardo con surcos verticales ondulados,
 * crestas más claras y manchas de liquen. Devuelve color y relieve (bump).
 */
export function barkTextures() {
  const w = 256;
  const h = 512;
  const color = makeCanvas(w, h);
  const bump = makeCanvas(w, h);
  const rand = rng(11);
  color.ctx.fillStyle = "#5e5044";
  color.ctx.fillRect(0, 0, w, h);
  bump.ctx.fillStyle = "#9a9a9a";
  bump.ctx.fillRect(0, 0, w, h);
  blotches(color.ctx, w, rand, 40, 20, 70, ["rgba(40,30,22,0.35)", "rgba(130,118,100,0.3)"]);
  // Surcos: líneas verticales onduladas.
  for (let i = 0; i < 34; i++) {
    const x0 = rand() * w;
    const amp = 3 + rand() * 6;
    const freq = 0.01 + rand() * 0.02;
    const phase = rand() * 10;
    const width = 2 + rand() * 4;
    const trace = (ctx: CanvasRenderingContext2D, shift: number) => {
      for (const dx of [0, -w, w]) {
        ctx.beginPath();
        for (let y = 0; y <= h; y += 8) {
          const x = x0 + dx + shift + Math.sin(y * freq * Math.PI * 2 + phase) * amp;
          if (y) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    };
    color.ctx.strokeStyle = "rgba(28,20,15,0.85)";
    color.ctx.lineWidth = width;
    trace(color.ctx, 0);
    bump.ctx.strokeStyle = "#1a1a1a";
    bump.ctx.lineWidth = width;
    trace(bump.ctx, 0);
    // Cresta clara al lado del surco.
    color.ctx.strokeStyle = "rgba(160,145,122,0.35)";
    color.ctx.lineWidth = 2;
    trace(color.ctx, width);
  }
  // Liquen y musgo en manchitas.
  for (let i = 0; i < 120; i++) {
    color.ctx.fillStyle = pick(rand, ["rgba(140,150,110,0.5)", "rgba(95,120,60,0.45)", "rgba(170,170,150,0.35)"]);
    color.ctx.beginPath();
    color.ctx.ellipse(rand() * w, rand() * h, 2 + rand() * 6, 2 + rand() * 4, rand() * 3, 0, Math.PI * 2);
    color.ctx.fill();
  }
  for (let i = 0; i < 2500; i++) {
    color.ctx.fillStyle = `rgba(${rand() > 0.6 ? "190,180,160" : "20,15,10"},${rand() * 0.15})`;
    color.ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 3);
  }
  return { map: toTexture(color.canvas), bump: toTexture(bump.canvas, { srgb: false }) };
}

function leafPath(ctx: CanvasRenderingContext2D, len: number, wid: number, lobed: boolean) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  if (!lobed) {
    ctx.quadraticCurveTo(len * 0.45, -wid * 0.55, len, 0);
    ctx.quadraticCurveTo(len * 0.45, wid * 0.55, 0, 0);
    return;
  }
  // Hoja lobulada tipo roble: ondas a cada lado.
  const lobes = 4;
  for (const s of [-1, 1]) {
    ctx.moveTo(0, 0);
    for (let k = 1; k <= lobes; k++) {
      const x0 = ((k - 0.5) / lobes) * len;
      const x1 = (k / lobes) * len;
      const amp = wid * 0.5 * Math.sin((k / (lobes + 1)) * Math.PI);
      ctx.quadraticCurveTo(x0, s * amp * 1.25, x1, k === lobes ? 0 : s * amp * 0.45);
    }
    ctx.lineTo(0, 0);
  }
}

/**
 * Ramito de hojas anchas (alfa). El tallo va de izquierda (u = 0) a derecha
 * (u = 1); las hojas se dibujan en tonos neutros claros para que el color
 * final (verdes de día, alguno otoñal al atardecer) lo dé cada instancia.
 */
export function leafSprigTexture(seed: number, lobed: boolean) {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = rng(seed);
  const mid = size / 2;
  ctx.strokeStyle = "#6b5a40";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(6, mid + 6);
  ctx.quadraticCurveTo(110, mid - 8, 205, mid);
  ctx.stroke();
  const tones = ["#c9d6a2", "#b4c48a", "#d8e0b0", "#a6b47c", "#bfcf94", "#94a46e"];
  const leaves = 130;
  for (let i = 0; i < leaves; i++) {
    const t = 0.08 + Math.pow(rand(), 0.7) * 0.92;
    const bx = 10 + t * 195;
    const by = mid + 6 - t * 8;
    const side = rand() > 0.5 ? 1 : -1;
    const ang = side * (0.45 + rand() * 0.9) - 0.1;
    const len = 16 + rand() * 16;
    const wid = len * (lobed ? 0.55 : 0.45);
    // Las hojas cuelgan de ramitas laterales: se reparten a lo ancho de la tarjeta.
    const spread = (1 - Math.abs(t - 0.55)) * 46;
    ctx.save();
    ctx.translate(bx + (rand() - 0.5) * 12, by + side * rand() * spread);
    ctx.rotate(ang);
    // Sombra suave debajo de cada hoja: da volumen al ramito.
    ctx.save();
    ctx.translate(2, 2.5);
    ctx.fillStyle = "rgba(35,45,20,0.45)";
    leafPath(ctx, len, wid, lobed);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = pick(rand, tones);
    leafPath(ctx, len, wid, lobed);
    ctx.fill();
    // Mitad en sombra y nervadura.
    ctx.fillStyle = "rgba(60,70,35,0.22)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.5, wid * 0.55, len, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(245,248,220,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len - 4, 0);
    ctx.stroke();
    ctx.restore();
  }
  return toTexture(canvas, { repeat: false });
}

/** Hojarasca: hojas secas sobre tierra oscura (bajo las copas). */
export function leafLitterTexture() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = rng(5);
  ctx.fillStyle = "#3b2d1f";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 50, 15, 60, ["rgba(20,14,8,0.4)", "rgba(110,85,50,0.3)", "rgba(70,80,35,0.3)"]);
  const tones = ["#7a5a32", "#8f6a3a", "#a5763e", "#6a4a2a", "#b58a4a", "#5e4a2e", "#8a7a40", "#9a5a2e"];
  for (let i = 0; i < 1400; i++) {
    const len = 7 + rand() * 12;
    const ang = rand() * Math.PI * 2;
    const tone = pick(rand, tones);
    const alpha = 0.6 + rand() * 0.4;
    wrapDraw(size, size, rand() * size, rand() * size, 24, (px, py) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(15,10,5,0.5)";
      ctx.beginPath();
      ctx.ellipse(1.5, 1.5, len, len * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(40,25,10,0.5)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.restore();
    });
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas);
}

/** Pasto denso visto desde arriba: verdes con variación y briznas. */
export function groundGrassTexture() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = rng(17);
  ctx.fillStyle = "#3f6a26";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 60, 20, 80, ["rgba(90,130,45,0.35)", "rgba(25,50,15,0.35)", "rgba(130,140,60,0.25)"]);
  const tones = ["#4f7f2c", "#365f1e", "#6a9a38", "#7fa648", "#2c4e18", "#5a8a30", "#97a85a"];
  ctx.lineCap = "round";
  for (let i = 0; i < 16000; i++) {
    ctx.strokeStyle = pick(rand, tones);
    ctx.globalAlpha = 0.45 + rand() * 0.5;
    ctx.lineWidth = 1 + rand() * 0.8;
    const dx = (rand() - 0.5) * 6;
    const dy = -4 - rand() * 8;
    wrapDraw(size, size, rand() * size, rand() * size, 14, (px, py) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx, py + dy);
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas);
}

/** Tierra apisonada del sendero con piedritas. */
export function dirtTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = rng(9);
  ctx.fillStyle = "#7a5f43";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 40, 10, 40, ["rgba(60,42,28,0.4)", "rgba(160,130,95,0.35)"]);
  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = rand() > 0.5 ? `rgba(190,165,130,${rand() * 0.4})` : `rgba(50,35,22,${rand() * 0.4})`;
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  for (let i = 0; i < 90; i++) {
    const r = 1.5 + rand() * 3.5;
    const tone = pick(rand, ["#a39a8a", "#8a8274", "#bdb4a2", "#6e675c"]);
    wrapDraw(size, size, rand() * size, rand() * size, 8, (px, py) => {
      ctx.fillStyle = "rgba(30,20,10,0.5)";
      ctx.beginPath();
      ctx.ellipse(px + 1, py + 1, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return toTexture(canvas);
}

/**
 * Luz moteada que se cuela entre las copas: manchas claras difusas sobre
 * negro. El suelo la usa como multiplicador (canal R).
 */
export function dappleTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = rng(31);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 6 + rand() * 26;
    const k = 0.35 + rand() * 0.65;
    const squash = 0.5 + rand() * 0.5;
    const rot = rand() * 3;
    wrapDraw(size, size, x, y, 40, (px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${k})`);
      g.addColorStop(0.55, `rgba(255,255,255,${k * 0.55})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * squash, rot, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return toTexture(canvas, { srgb: false });
}

/**
 * Fronda de helecho (alfa): raquis vertical de abajo (v = 0) hacia arriba
 * (v = 1) con pinnas que se achican hacia la punta.
 */
export function fernTexture() {
  const w = 128;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = rng(61);
  const cx = w / 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4a5a26";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, h);
  ctx.quadraticCurveTo(cx + 4, h / 2, cx, 4);
  ctx.stroke();
  const greens = ["#4b7a2a", "#5c8a34", "#3f6a24", "#6c963c"];
  const pairs = 16;
  for (let i = 0; i < pairs; i++) {
    const t = i / pairs;
    const y = h - 20 - t * (h - 30);
    const len = (1 - t) * 52 + 8;
    for (const side of [-1, 1]) {
      const baseX = cx + Math.sin(t * 3) * 2;
      const tipX = baseX + side * len;
      const tipY = y - len * 0.35;
      ctx.fillStyle = pick(rand, greens);
      const lobes = Math.max(3, Math.round(len / 6));
      for (let k = 0; k < lobes; k++) {
        const s = (k + 0.5) / lobes;
        const lr = (1 - s * 0.7) * 5.2;
        ctx.beginPath();
        ctx.ellipse(baseX + (tipX - baseX) * s, y + (tipY - y) * s, lr * 0.9, lr * 1.5, side * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(60,80,30,0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(baseX, y);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }
  }
  return toTexture(canvas, { repeat: false });
}

/**
 * Grano de piedra (gris medio, repetible): manchas, motas claras y oscuras y
 * alguna fisura. Las rocas lo proyectan en tres planos y lo multiplican por su
 * color por vértice (canal R, lineal).
 */
export function rockDetailTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = rng(71);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, rand, 70, 8, 40, ["rgba(40,40,40,0.25)", "rgba(200,200,200,0.22)", "rgba(110,110,110,0.3)"]);
  for (let i = 0; i < 9000; i++) {
    const v = rand() > 0.5 ? 210 : 45;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * 0.35})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.strokeStyle = "rgba(30,30,30,0.55)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    let x = rand() * size;
    let y = rand() * size;
    let a = rand() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      a += (rand() - 0.5) * 1.2;
      x += Math.cos(a) * 7;
      y += Math.sin(a) * 7;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(canvas, { srgb: false });
}

/** Haz de luz: franja blanca que se desvanece a los costados y en los extremos. */
export function shaftTexture() {
  const w = 64;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = rng(83);
  const img = ctx.createImageData(w, h);
  const streak = Array.from({ length: w }, () => 0.7 + rand() * 0.3);
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 = arriba (hacia el sol), 1 = al pie
    const along = smooth(0, 0.35, v) * (1 - smooth(0.7, 1, v));
    for (let x = 0; x < w; x++) {
      const across = Math.pow(Math.sin((Math.PI * x) / (w - 1)), 2.2);
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(along * across * streak[x] * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas, { srgb: false, repeat: false });
}
