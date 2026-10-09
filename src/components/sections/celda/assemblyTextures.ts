import * as THREE from "three";

/*
 * Texturas procedurales (canvas) de la línea de montaje. Nada se descarga:
 * se dibujan una vez al montar el entorno. Todas usan un generador
 * determinístico para salir siempre iguales.
 */

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

function toTexture(c: HTMLCanvasElement, repeatX = 1, repeatY = 1, color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Ruido de manchas suaves (suciedad, desgaste) sobre lo que ya hay dibujado. */
function grime(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, n: number, alpha: number, dark = true) {
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 8 + rand() * w * 0.12;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = dark ? "0,0,0" : "255,255,255";
    g.addColorStop(0, `rgba(${c},${alpha * (0.4 + rand() * 0.6)})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number, n: number, base: number, spread: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = Math.floor(base + rand() * spread);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 4},${alpha * rand()})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

export type Theme = "light" | "dark";

/**
 * Pared de chapa nervada (paneles verticales) con zócalo, suciedad que sube
 * desde el piso y remaches. Una textura cubre 4 paneles × toda la altura.
 */
export function wallTexture(theme: Theme) {
  const w = 512;
  const h = 512;
  const rand = rng(23);
  const { c, ctx } = canvas(w, h);
  const base = theme === "dark" ? "#2a3033" : "#a9b0b3";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // nervaduras: bandas verticales con luz y sombra
  for (let x = 0; x < w; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, "rgba(0,0,0,0.28)");
    g.addColorStop(0.25, "rgba(255,255,255,0.07)");
    g.addColorStop(0.5, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 32, h);
  }
  // juntas de panel cada 128 px y remaches
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  for (let x = 0; x < w; x += 128) ctx.fillRect(x, 0, 3, h);
  ctx.fillRect(0, h * 0.45, w, 3);
  ctx.fillStyle = theme === "dark" ? "rgba(170,180,185,0.35)" : "rgba(60,66,70,0.45)";
  for (let x = 0; x < w; x += 128)
    for (let y = 12; y < h; y += 40) {
      ctx.beginPath();
      ctx.arc(x + 8, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  speckle(ctx, w, h, rand, 5000, theme === "dark" ? 40 : 140, 60, 0.12);
  // suciedad que sube desde el zócalo y chorreaduras
  const dirt = ctx.createLinearGradient(0, h, 0, h * 0.55);
  dirt.addColorStop(0, "rgba(10,8,6,0.55)");
  dirt.addColorStop(1, "rgba(10,8,6,0)");
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.5;
    const len = 30 + rand() * 120;
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, "rgba(0,0,0,0.2)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 2 + rand() * 4, len);
  }
  return toTexture(c, 1, 1);
}

/** Franjas de peligro amarillo/negro a 45°, gastadas. */
export function hazardTexture(repeatX = 1, repeatY = 1) {
  const s = 128;
  const rand = rng(3);
  const { c, ctx } = canvas(s, s);
  ctx.fillStyle = "#161718";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#d9a400";
  for (let k = -2; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 64, 0);
    ctx.lineTo(k * 64 + 32, 0);
    ctx.lineTo(k * 64 + 32 + s, s);
    ctx.lineTo(k * 64 + s, s);
    ctx.closePath();
    ctx.fill();
  }
  speckle(ctx, s, s, rand, 900, 10, 30, 0.5);
  grime(ctx, s, s, rand, 10, 0.25);
  return toTexture(c, repeatX, repeatY);
}

/** Banda de goma con tacos transversales; se desplaza animando `offset.x`. */
export function beltTexture(repeat: number) {
  const w = 256;
  const h = 64;
  const rand = rng(9);
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = "#151719";
  ctx.fillRect(0, 0, w, h);
  speckle(ctx, w, h, rand, 1800, 30, 30, 0.35);
  for (let x = 0; x < w; x += 32) {
    ctx.fillStyle = "#24282b";
    ctx.fillRect(x, 4, 7, h - 8);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(x, 4, 2, h - 8);
  }
  ctx.fillStyle = "#0c0d0e";
  ctx.fillRect(0, 0, w, 4);
  ctx.fillRect(0, h - 4, w, 4);
  return toTexture(c, repeat, 1);
}

/** Rejilla de pasarela (metal desplegado) — oscura con nervios claros. */
export function gratingTexture(repeatX: number, repeatY: number) {
  const s = 64;
  const { c, ctx } = canvas(s, s);
  ctx.fillStyle = "#0b0d0e";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#4a5256";
  ctx.lineWidth = 3;
  for (let i = 0; i <= s; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
  }
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= s; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
  }
  return toTexture(c, repeatX, repeatY);
}

/** Cortina de persiana metálica (lamas horizontales). */
export function shutterTexture(theme: Theme) {
  const w = 128;
  const h = 256;
  const rand = rng(17);
  const { c, ctx } = canvas(w, h);
  ctx.fillStyle = theme === "dark" ? "#30363a" : "#7d8589";
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    const g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, "rgba(255,255,255,0.12)");
    g.addColorStop(0.6, "rgba(0,0,0,0.1)");
    g.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, 16);
  }
  grime(ctx, w, h, rand, 14, 0.2);
  return toTexture(c, 1, 1);
}

/** Cartel pintado (texto claro sobre placa oscura con borde amarillo). */
export function signTexture(title: string, sub: string) {
  const { c, ctx } = canvas(512, 160);
  ctx.fillStyle = "#121517";
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = "#d9a400";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 150);
  ctx.fillStyle = "#e9ecee";
  ctx.font = "800 70px Sora, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 34, 66);
  ctx.fillStyle = "#d9a400";
  ctx.font = "600 26px ui-monospace, monospace";
  ctx.fillText(sub, 36, 122);
  const t = toTexture(c, 1, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Mancha radial suave (charcos de luz en el piso, halos). */
export function glowTexture() {
  const s = 128;
  const { c, ctx } = canvas(s, s);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = toTexture(c, 1, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Haz de luz: degradé vertical que se apaga hacia abajo y hacia los bordes. */
export function shaftTexture() {
  const w = 64;
  const h = 256;
  const { c, ctx } = canvas(w, h);
  const v = ctx.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, "rgba(255,255,255,0.9)");
  v.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in";
  const hz = ctx.createLinearGradient(0, 0, w, 0);
  hz.addColorStop(0, "rgba(0,0,0,0)");
  hz.addColorStop(0.5, "rgba(0,0,0,1)");
  hz.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hz;
  ctx.fillRect(0, 0, w, h);
  const t = toTexture(c, 1, 1);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * Pantalla de datos de la línea. Devuelve la textura y una función `draw`
 * para redibujarla (se llama pocas veces por segundo, no en cada cuadro).
 */
export function screenTexture() {
  const w = 256;
  const h = 128;
  const { c, ctx } = canvas(w, h);
  const texture = toTexture(c, 1, 1);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  const bars = Array.from({ length: 18 }, () => 0.3);
  function draw(accent: string, count: number, busy: boolean, tick: number) {
    ctx.fillStyle = "#050807";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.font = "700 15px ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.fillText("LINEA 01", 12, 10);
    ctx.globalAlpha = 0.65;
    ctx.fillText(busy ? "PROCESANDO" : "EN ESPERA", 12, 30);
    ctx.globalAlpha = 1;
    ctx.font = "800 34px ui-monospace, monospace";
    ctx.fillText(String(count).padStart(5, "0"), 130, 8);
    ctx.font = "600 11px ui-monospace, monospace";
    ctx.globalAlpha = 0.6;
    ctx.fillText("UNIDADES", 132, 44);
    // histograma que se desplaza
    bars.shift();
    bars.push(0.25 + 0.7 * Math.abs(Math.sin(tick * 1.7) * Math.cos(tick * 0.6)));
    ctx.globalAlpha = 0.85;
    bars.forEach((b, i) => ctx.fillRect(12 + i * 13, 118 - b * 52, 9, b * 52));
    ctx.globalAlpha = 0.25;
    ctx.fillRect(12, 119, 232, 1);
    // líneas de barrido
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#000";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }
  return { texture, draw };
}
