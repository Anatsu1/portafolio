import * as THREE from "three";

/** Generador pseudoaleatorio determinístico: las texturas salen siempre iguales. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTexture(canvas: HTMLCanvasElement, repeatX: number, repeatY: number) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Piso de hormigón con juntas de losa y manchas. */
export function concreteTexture(base = "#2a2e30", seam = "#16191a", repeat = 10) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(7);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(rand() * 40);
    ctx.fillStyle = `rgba(${v + 20},${v + 22},${v + 24},${0.08 + rand() * 0.12})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2.5, 1 + rand() * 2.5);
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + rand() * 0.05})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 14 + rand() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = seam;
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, size, size);
  return toTexture(canvas, repeat, repeat);
}

/** Pared de paneles de chapa con remaches. */
export function panelWallTexture(base = "#23282b", repeatX = 12, repeatY = 3) {
  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(21);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand() * 0.035})`;
    ctx.fillRect(rand() * w, rand() * h, 1, 2 + rand() * 6);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 5;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = "rgba(180,190,195,0.35)";
  for (const [x, y] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16], [16, h / 2], [w - 16, h / 2]]) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d9a400";
  ctx.fillRect(0, h - 28, w, 12);
  return toTexture(canvas, repeatX, repeatY);
}

/** Césped con variaciones de tono. */
export function grassTexture(base = "#4f7a35", dark = "#3d6228", light = "#69964a", repeat = 18) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(3);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 14000; i++) {
    ctx.strokeStyle = rand() > 0.5 ? dark : light;
    ctx.globalAlpha = 0.25 + rand() * 0.3;
    const x = rand() * size;
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 4, y - 3 - rand() * 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return toTexture(canvas, repeat, repeat);
}

/** Cinta transportadora con tacos; se desplaza animando `offset`. */
export function beltTexture() {
  const w = 256;
  const h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#16191b";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#262b2e";
  for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 6, h);
  ctx.fillStyle = "rgba(217,164,0,0.8)";
  ctx.fillRect(0, 0, w, 5);
  ctx.fillRect(0, h - 5, w, 5);
  return toTexture(canvas, 14, 1);
}
