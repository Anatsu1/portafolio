import * as THREE from "three";
import { rng } from "./forestScatter";

/*
 * Texturas de canvas del puesto de campo (sin descargas): un atlas con los
 * carteles y las celdas de los paneles solares, la banda de la cinta, la
 * pantalla de la consola y los degradés de los conos de luz.
 */

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Desgaste: manchas y rayones encima de lo ya dibujado. */
function weather(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  const rand = rng(seed);
  for (let i = 0; i < 40; i++) {
    const r = 4 + rand() * 18;
    const cx = x + rand() * w;
    const cy = y + rand() * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(40,30,15,${0.08 + rand() * 0.12})`);
    g.addColorStop(1, "rgba(40,30,15,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 50; i++) {
    const cx = x + rand() * w;
    const cy = y + rand() * h;
    ctx.strokeStyle = rand() > 0.5 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (rand() - 0.3) * 30, cy + (rand() - 0.5) * 6);
    ctx.stroke();
  }
}

/** Triángulo de advertencia con un símbolo dentro. */
function warnTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, glyph: "!" | "bolt" | "arm") {
  ctx.fillStyle = "#141414";
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 1.1, cy + s * 0.85);
  ctx.lineTo(cx - s * 1.1, cy + s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d9a400";
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.66);
  ctx.lineTo(cx + s * 0.8, cy + s * 0.68);
  ctx.lineTo(cx - s * 0.8, cy + s * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#141414";
  ctx.strokeStyle = "#141414";
  if (glyph === "!") {
    ctx.fillRect(cx - s * 0.08, cy - s * 0.3, s * 0.16, s * 0.55);
    ctx.fillRect(cx - s * 0.08, cy + s * 0.34, s * 0.16, s * 0.15);
  } else if (glyph === "bolt") {
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.1, cy - s * 0.38);
    ctx.lineTo(cx - s * 0.22, cy + s * 0.12);
    ctx.lineTo(cx + s * 0.02, cy + s * 0.1);
    ctx.lineTo(cx - s * 0.1, cy + s * 0.52);
    ctx.lineTo(cx + s * 0.24, cy - s * 0.04);
    ctx.lineTo(cx, cy - s * 0.02);
    ctx.closePath();
    ctx.fill();
  } else {
    // Brazo robótico esquemático: base, dos tramos y pinza.
    ctx.lineWidth = s * 0.11;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.35, cy + s * 0.5);
    ctx.lineTo(cx - s * 0.15, cy + s * 0.5);
    ctx.moveTo(cx - s * 0.25, cy + s * 0.48);
    ctx.lineTo(cx - s * 0.2, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.25, cy - s * 0.2);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.12);
    ctx.stroke();
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.2, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.12);
    ctx.lineTo(cx + s * 0.4, cy + s * 0.2);
    ctx.stroke();
  }
}

/**
 * Regiones del atlas en UV (u0, v0, u1, v1; v hacia arriba como en three).
 * El canvas es de 512 × 512 y cada región deja un margen para que los mipmaps
 * no mezclen vecinos.
 */
export const ATLAS = {
  zone: [0, 0.625, 1, 1] as const, // cartel ancho "ZONA ROBOTIZADA" (512 × 192)
  volt: [0, 0.25, 0.5, 0.625] as const, // "ALTO VOLTAJE" (256 × 192)
  station: [0.5, 0.25, 1, 0.625] as const, // placa "RECEPCIÓN R-01" (256 × 192)
  solar: [0, 0.035, 1, 0.25] as const, // celdas de panel solar (512 × 110)
  paint: [0.1, 0.004, 0.9, 0.018] as const, // muestra de amarillo seguridad liso
};

export function atlasTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, 512, 512);
  const font = (w: number, px: number) => `${w} ${px}px 'Arial Black', Arial, sans-serif`;
  ctx.textBaseline = "middle";

  // Cartel ancho amarillo con borde negro (y = 0..192).
  ctx.fillStyle = "#d9a400";
  ctx.fillRect(4, 4, 504, 184);
  ctx.strokeStyle = "#141414";
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, 484, 164);
  warnTriangle(ctx, 92, 98, 62, "arm");
  ctx.fillStyle = "#141414";
  ctx.font = font(900, 50);
  ctx.fillText("ZONA", 176, 66);
  ctx.fillText("ROBOTIZADA", 176, 116);
  ctx.font = font(700, 21);
  ctx.fillText("SOLO PERSONAL AUTORIZADO", 178, 158);
  weather(ctx, 4, 4, 504, 184, 3);

  // Placa cuadrada "ALTO VOLTAJE" (x 0..256, y 192..384).
  ctx.fillStyle = "#e9e4d6";
  ctx.fillRect(4, 196, 248, 184);
  ctx.fillStyle = "#141414";
  ctx.fillRect(4, 196, 248, 48);
  ctx.fillStyle = "#d9a400";
  ctx.font = font(900, 30);
  ctx.textAlign = "center";
  ctx.fillText("PELIGRO", 128, 221);
  warnTriangle(ctx, 128, 300, 46, "bolt");
  ctx.fillStyle = "#141414";
  ctx.font = font(700, 20);
  ctx.fillText("ALTO VOLTAJE", 128, 362);
  weather(ctx, 4, 196, 248, 184, 4);

  // Placa de la estación (x 256..512, y 192..384): fondo oscuro, letras amarillas.
  ctx.fillStyle = "#1a1d1f";
  ctx.fillRect(260, 196, 248, 184);
  ctx.strokeStyle = "#d9a400";
  ctx.lineWidth = 5;
  ctx.strokeRect(270, 206, 228, 164);
  ctx.fillStyle = "#d9a400";
  ctx.font = font(900, 36);
  ctx.fillText("RECEPCIÓN", 384, 262);
  ctx.font = font(700, 24);
  ctx.fillText("PUESTO 07 · R-01", 384, 312);
  ctx.font = "600 15px ui-monospace, monospace";
  ctx.fillText("CARGA MÁX 40 KG", 384, 346);
  ctx.textAlign = "left";
  weather(ctx, 260, 196, 248, 184, 5);

  // Celdas solares (y = 384..512): azul profundo, grilla plateada y bus bars.
  ctx.fillStyle = "#0d1a33";
  ctx.fillRect(0, 388, 512, 108);
  const rand = rng(6);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 16; i++) {
      const x = 4 + i * 31.7;
      const y = 390 + j * 26.5;
      const g = ctx.createLinearGradient(x, y, x + 30, y + 28);
      const k = 0.85 + rand() * 0.3;
      g.addColorStop(0, `rgb(${26 * k},${48 * k},${92 * k})`);
      g.addColorStop(1, `rgb(${14 * k},${28 * k},${60 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, y + 1, 29, 24);
      ctx.fillStyle = "rgba(180,190,200,0.35)";
      for (const bx of [10, 20]) ctx.fillRect(x + bx, y + 1, 1, 24);
    }
  }
  // Pintura lisa amarilla (piezas pintadas: barrera, gabinetes).
  ctx.fillStyle = "#d9a400";
  ctx.fillRect(0, 500, 512, 12);
  return toTexture(c);
}

/** Banda de goma con tacos transversales (se repite a lo largo; u = largo). */
export function beltTexture() {
  const [c, ctx] = makeCanvas(128, 64);
  ctx.fillStyle = "#1c1e1f";
  ctx.fillRect(0, 0, 128, 64);
  const rand = rng(21);
  for (let i = 0; i < 900; i++) {
    const v = 20 + rand() * 30;
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(rand() * 128, rand() * 64, 2, 1);
  }
  for (const x of [8, 72]) {
    ctx.fillStyle = "#2f3335";
    ctx.fillRect(x, 3, 7, 58);
    ctx.fillStyle = "#45494b";
    ctx.fillRect(x, 3, 2, 58);
  }
  // Bordes de la banda más gastados.
  ctx.fillStyle = "rgba(90,90,85,0.35)";
  ctx.fillRect(0, 0, 128, 3);
  ctx.fillRect(0, 61, 128, 3);
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/**
 * Degradés para la luz falsa (aditiva): mitad izquierda, charco radial;
 * mitad derecha, cono que se apaga a lo largo (v = 1 junto al reflector).
 */
export function glowGradientTexture() {
  const [c, ctx] = makeCanvas(128, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const img = ctx.getImageData(64, 0, 64, 64);
  for (let y = 0; y < 64; y++) {
    const v = 1 - y / 63; // arriba del canvas = v 1
    for (let x = 0; x < 64; x++) {
      const across = Math.pow(Math.sin((Math.PI * (x + 0.5)) / 64), 1.5);
      const a = Math.pow(v, 2.2) * across * 255;
      const i = (y * 64 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = a;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 64, 0);
  return toTexture(c);
}

/**
 * Pantalla de la consola. `draw` se llama pocas veces por segundo con el color
 * de marca, el contador de cajas recibidas y si hay una caja entrando.
 */
export function consoleScreen() {
  const w = 256;
  const h = 160;
  const [c, ctx] = makeCanvas(w, h);
  const texture = toTexture(c);
  const trace = Array.from({ length: 40 }, () => 0.5);
  function draw(accent: string, count: number, busy: boolean, tick: number) {
    ctx.fillStyle = "#04080a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.textBaseline = "top";
    ctx.font = "700 14px ui-monospace, monospace";
    ctx.fillText("PUESTO DE CAMPO 07", 12, 10);
    ctx.globalAlpha = 0.6;
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.fillText("BRAZO R-01 · ENLACE OK", 12, 30);
    ctx.fillText(busy ? "> RECIBIENDO CARGA" : "> EN ESPERA", 12, 46);
    ctx.globalAlpha = 1;
    ctx.font = "800 30px ui-monospace, monospace";
    ctx.fillText(String(count).padStart(4, "0"), 168, 26);
    ctx.font = "600 10px ui-monospace, monospace";
    ctx.globalAlpha = 0.6;
    ctx.fillText("CAJAS", 170, 60);
    // Traza tipo osciloscopio (temperatura / vibración de la cinta).
    trace.shift();
    trace.push(0.5 + 0.32 * Math.sin(tick * 0.9) * Math.cos(tick * 0.37) + (busy ? 0.12 : 0));
    ctx.globalAlpha = 0.25;
    ctx.fillRect(12, 84, 232, 1);
    ctx.fillRect(12, 148, 232, 1);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    trace.forEach((v, i) => (i ? ctx.lineTo(12 + i * 6, 148 - v * 60) : ctx.moveTo(12, 148 - v * 60)));
    ctx.stroke();
    // Líneas de barrido.
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#000";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }
  return { texture, draw };
}
