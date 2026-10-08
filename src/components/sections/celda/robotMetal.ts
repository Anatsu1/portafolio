import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Materiales y utilidades de geometría para las piezas procedurales del brazo
 * (pedestal y torreta, ver robotBaseGeometry.ts). La idea para que se lea como
 * "metal duro" y combine con los modelos de Meshy:
 *
 *  - Geometría con chaflanes reales (no texturas que los simulan) y normales
 *    planas en las caras rectas: cada bisel da su línea de brillo.
 *  - Un único juego de texturas de canvas (grunge + rugosidad), proyectado por
 *    caja (UV según la cara), así la densidad es la misma en todas las piezas.
 *  - Desgaste de bordes: cada triángulo lleva un atributo `wear` (1 en los
 *    biseles y aristas finas, 0 en las caras). Un parche chico del shader lo
 *    mezcla con una máscara de ruido: en los bordes asoma acero pelado más
 *    claro, brillante y menos rugoso, como en el resto del brazo.
 *  - Color por vértice como tinte de cada pieza (gunmetal, tornillería clara,
 *    bronce del dentado…) para no multiplicar materiales.
 *
 * Todas las piezas que comparten material se fusionan en una sola malla:
 * un draw call por material.
 */

// ---------------------------------------------------------------- texturas --

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

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Ruido fractal (value noise) que repite sin costura, valores 0..1. */
function fbm(size: number, seed: number, octaves = 5, base = 4) {
  const rand = rng(seed);
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = base << o;
    const lattice = Array.from({ length: cells * cells }, rand);
    const at = (x: number, y: number) => lattice[(y % cells) * cells + (x % cells)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const fy = (y / size) * cells;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const sx = (fx - x0) ** 2 * (3 - 2 * (fx - x0));
        const sy = (fy - y0) ** 2 * (3 - 2 * (fy - y0));
        const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
        const bot = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
        out[y * size + x] += (top * (1 - sy) + bot * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Rayones finos (trazos cortos, casi rectos, con dirección dominante). */
function scratches(ctx: CanvasRenderingContext2D, size: number, seed: number, count: number, color: string) {
  const rand = rng(seed);
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 6 + rand() ** 2 * 60;
    const ang = (rand() < 0.7 ? 0.35 : 1.9) + (rand() - 0.5) * 0.5;
    ctx.globalAlpha = 0.15 + rand() * 0.45;
    ctx.lineWidth = rand() < 0.85 ? 0.6 : 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (rand() - 0.5) * 4, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Grunge del acero: casi blanco (el color real lo pone el tinte por vértice),
 * con manchas de suciedad, rayones claros y oscuros. También sirve de bump.
 */
function grungeCanvas() {
  const size = 512;
  const [c, ctx] = canvas(size);
  const n = fbm(size, 11, 6, 3);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < n.length; i++) {
    // Manchas grandes y suaves: entre 135 y 245 (mugre y zonas más limpias).
    const v = 135 + Math.min(1, Math.max(0, (n[i] - 0.28) * 1.9)) * 110;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v * 0.985;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // Grano fino.
  const rand = rng(5);
  for (let i = 0; i < 14000; i++) {
    const g = rand() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${g},${g},${g},${0.04 + rand() * 0.06})`;
    ctx.fillRect(rand() * size, rand() * size, 1, 1);
  }
  scratches(ctx, size, 3, 420, "#ffffff");
  scratches(ctx, size, 4, 220, "#3a3a3a");
  return c;
}

/**
 * Rugosidad (canal G, lo que lee three) + máscara de desgaste (canal B, la lee
 * el parche del shader). Rayones = más lisos; mugre = más rugoso.
 */
function roughCanvas() {
  const size = 256;
  const [c, ctx] = canvas(size);
  const r = fbm(size, 11, 5, 3);
  const chip = fbm(size, 29, 5, 8);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < r.length; i++) {
    img.data[i * 4] = 0;
    img.data[i * 4 + 1] = 130 + r[i] * 95; // rugosidad ~0,5..0,88
    img.data[i * 4 + 2] = chip[i] * 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  const rand = rng(3);
  ctx.strokeStyle = "rgb(0,70,0)";
  for (let i = 0; i < 120; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 4 + rand() * 25;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(0.35) * len, y + Math.sin(0.35) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

/** Franjas de seguridad #d9a400 / negro, gastadas. */
function hazardCanvas() {
  const size = 256;
  const [c, ctx] = canvas(size);
  ctx.fillStyle = "#d9a400";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#151515";
  // 4 franjas negras a 45° que empalman al repetir.
  const w = size / 4;
  for (let k = -4; k < 8; k++) {
    ctx.beginPath();
    ctx.moveTo(k * w, 0);
    ctx.lineTo(k * w + w / 2, 0);
    ctx.lineTo(k * w + w / 2 - size, size);
    ctx.lineTo(k * w - size, size);
    ctx.closePath();
    ctx.fill();
  }
  // Pintura saltada y mugre (multiplica sobre las franjas).
  const n = fbm(size, 41, 5, 4);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < n.length; i++) {
    const k = 0.72 + n[i] * 0.4;
    img.data[i * 4] *= k;
    img.data[i * 4 + 1] *= k;
    img.data[i * 4 + 2] *= k;
  }
  ctx.putImageData(img, 0, 0);
  scratches(ctx, size, 8, 90, "#3a3a3a");
  scratches(ctx, size, 9, 40, "#bdbdbd");
  return c;
}

/** Placa "CAUTION · MOVING PARTS" (amarilla con borde negro y remaches). */
function labelCanvas() {
  const [c, ctx] = canvas(512, 192);
  ctx.fillStyle = "#d9a400";
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = "#141414";
  ctx.fillRect(10, 10, 492, 172);
  ctx.fillStyle = "#d9a400";
  ctx.fillRect(18, 18, 476, 156);
  // Triángulo de advertencia.
  ctx.fillStyle = "#141414";
  ctx.beginPath();
  ctx.moveTo(92, 36);
  ctx.lineTo(152, 150);
  ctx.lineTo(32, 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#d9a400";
  ctx.beginPath();
  ctx.moveTo(92, 60);
  ctx.lineTo(136, 141);
  ctx.lineTo(48, 141);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#141414";
  ctx.fillRect(87, 82, 10, 34);
  ctx.fillRect(87, 122, 10, 10);
  ctx.textBaseline = "middle";
  ctx.font = "900 62px 'Arial Black', Arial, sans-serif";
  ctx.fillText("CAUTION", 176, 74);
  ctx.font = "700 34px Arial, sans-serif";
  ctx.fillText("MOVING PARTS", 178, 134);
  // Remaches.
  for (const [x, y] of [[30, 30], [482, 30], [30, 162], [482, 162]]) {
    ctx.fillStyle = "#8b8f92";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Uso: rayones y mugre.
  const n = fbm(128, 77, 4, 4);
  for (let i = 0; i < 600; i++) {
    const x = (i * 37) % 128;
    const y = Math.floor((i * 37) / 128) % 128;
    ctx.fillStyle = `rgba(30,24,10,${n[y * 128 + x] * 0.18})`;
    ctx.fillRect(x * 4, y * 1.5, 8, 4);
  }
  scratches(ctx, 512, 13, 70, "#ffffff");
  scratches(ctx, 512, 14, 50, "#2a2a2a");
  return c;
}

/** Malla trenzada de los cables (se repite a lo largo del tubo). */
function braidCanvas() {
  const [c, ctx] = canvas(64);
  ctx.fillStyle = "#0c0d0e";
  ctx.fillRect(0, 0, 64, 64);
  ctx.lineWidth = 5;
  for (let k = -64; k < 128; k += 12) {
    ctx.strokeStyle = "#3a3d40";
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + 64, 64);
    ctx.stroke();
    ctx.strokeStyle = "#2b2e31";
    ctx.beginPath();
    ctx.moveTo(k + 64, 0);
    ctx.lineTo(k, 64);
    ctx.stroke();
  }
  return c;
}

// --------------------------------------------------------------- materiales --

const WORN = new THREE.Color("#a2a7ab");

/**
 * Parche del shader estándar: `wear` (atributo por vértice) × máscara de
 * ruido = acero pelado. `wear` > 1,5 marca piezas mecanizadas enteras (dentado,
 * eje): brillo uniforme sin máscara.
 */
function addWear(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wornColor = { value: WORN };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float wear;\nvarying float vWear;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWear = wear;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 wornColor;\nvarying float vWear;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float chip = texture2D( roughnessMap, vRoughnessMapUv * 1.7 ).b;
        float wearAmt = vWear > 1.5 ? 0.35 : vWear * smoothstep( 0.38, 0.56, chip );
        diffuseColor.rgb = mix( diffuseColor.rgb, wornColor * ( 0.7 + 0.5 * chip ), wearAmt );`,
      )
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.32, wearAmt );")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix( metalnessFactor, 1.0, wearAmt );");
  };
  material.customProgramCacheKey = () => "robot-wear";
  return material;
}

export type RobotMaterials = {
  steel: THREE.MeshStandardMaterial;
  hazard: THREE.MeshStandardMaterial;
  label: THREE.MeshStandardMaterial;
  cable: THREE.MeshStandardMaterial;
};

let shared: RobotMaterials | null = null;

/**
 * Materiales compartidos por pedestal y torreta (se crean una vez y viven
 * mientras viva la página: son 5 texturas chicas, no vale la pena liberarlas).
 */
export function robotMaterials(): RobotMaterials {
  if (shared) return shared;
  const grunge = toTexture(grungeCanvas(), true);
  const grungeBump = toTexture(grunge.image as HTMLCanvasElement, false);
  const rough = toTexture(roughCanvas(), false);
  const hazard = toTexture(hazardCanvas(), true);
  const label = toTexture(labelCanvas(), true);
  label.wrapS = label.wrapT = THREE.ClampToEdgeWrapping;
  const braid = toTexture(braidCanvas(), true);

  shared = {
    steel: addWear(
      new THREE.MeshStandardMaterial({
        map: grunge,
        roughnessMap: rough,
        bumpMap: grungeBump,
        bumpScale: 0.35,
        metalness: 0.62,
        roughness: 1,
        vertexColors: true,
      }),
    ),
    hazard: addWear(
      new THREE.MeshStandardMaterial({
        map: hazard,
        roughnessMap: rough,
        bumpMap: grungeBump,
        bumpScale: 0.25,
        metalness: 0.3,
        roughness: 1.15,
        vertexColors: true,
      }),
    ),
    label: new THREE.MeshStandardMaterial({ map: label, metalness: 0.3, roughness: 0.55, vertexColors: true }),
    cable: new THREE.MeshStandardMaterial({ map: braid, bumpMap: braid, bumpScale: 1.2, metalness: 0.1, roughness: 0.62, vertexColors: true }),
  };
  return shared;
}

// ------------------------------------------------------- piezas y fusionado --

export type PartOptions = {
  /** Tinte (sRGB) que multiplica la textura. */
  tint?: string;
  /** Eje local de las tapas de la pieza ("z" para extrusiones, "y" para tornos). */
  capAxis?: "y" | "z";
  /** Ancho por debajo del cual una cara lateral cuenta como arista (desgaste). */
  edge?: number;
  /** Desgaste de toda la pieza: 2 = mecanizada (brillo parejo). */
  wear?: number;
  /** "box": UV proyectadas por caja (escala en unidades⁻¹); "keep": UV propias × escala. */
  uv?: "box" | "keep";
  uvScale?: [number, number];
  /** Normales planas por triángulo (piezas facetadas); si no, se conservan. */
  flat?: boolean;
  /** Deformación libre de vértices, ya aplicada la matriz (ej. ahusado). */
  warp?: (p: THREE.Vector3) => void;
};

const BOX_UV = 1.35; // repeticiones de textura por unidad

/**
 * Prepara una geometría para fusionarla: no indexada, desgaste por triángulo,
 * transformada, con UV y tinte. Todas salen con los mismos atributos
 * (position, normal, uv, color, wear), que es lo que exige mergeGeometries.
 */
export function part(source: THREE.BufferGeometry, matrix: THREE.Matrix4, o: PartOptions = {}) {
  const g = source.index ? source.toNonIndexed() : source.clone();
  source.dispose();
  g.clearGroups();
  if (!g.getAttribute("normal") || o.flat) g.computeVertexNormals();

  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const count = pos.count;
  const wear = new Float32Array(count);
  const axis = o.capAxis === "y" ? 1 : 2;
  const edge = o.edge ?? 0.022;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < count; i += 3) {
    let w = o.wear ?? 0;
    if (w < 1.5) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      // Normal de la cara (no la suavizada) en espacio local.
      n.subVectors(c, b).cross(b.clone().sub(a)).normalize();
      const along = Math.abs(n.getComponent(axis));
      if (along > 0.08 && along < 0.985) w = 1; // bisel
      else if (along <= 0.08 && edge > 0) {
        // Cara lateral angosta (chaflán vertical, flanco de diente…).
        const ab = a.distanceTo(b);
        const bc = b.distanceTo(c);
        const ca = c.distanceTo(a);
        const area = n.subVectors(b, a).cross(c.clone().sub(a)).length() / 2;
        if ((2 * area) / Math.max(ab, bc, ca) < edge) w = Math.max(w, 1);
      }
    }
    wear[i] = wear[i + 1] = wear[i + 2] = w;
  }

  g.applyMatrix4(matrix);
  if (o.warp) {
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(pos, i);
      o.warp(v);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  if (o.flat || o.warp) g.computeVertexNormals();

  // UV
  const uvs = new Float32Array(count * 2);
  const [su, sv] = o.uvScale ?? [1, 1];
  if (o.uv === "keep") {
    const src = g.getAttribute("uv");
    for (let i = 0; i < count; i++) {
      uvs[i * 2] = (src ? src.getX(i) : 0) * su;
      uvs[i * 2 + 1] = (src ? src.getY(i) : 0) * sv;
    }
  } else {
    const p = g.getAttribute("position");
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(p, i);
      b.fromBufferAttribute(p, i + 1);
      c.fromBufferAttribute(p, i + 2);
      n.subVectors(c, b).cross(b.clone().sub(a));
      const ax = Math.abs(n.x);
      const ay = Math.abs(n.y);
      const az = Math.abs(n.z);
      for (let k = 0; k < 3; k++) {
        const x = p.getX(i + k);
        const y = p.getY(i + k);
        const z = p.getZ(i + k);
        const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
        uvs[(i + k) * 2] = u * BOX_UV * su;
        uvs[(i + k) * 2 + 1] = v * BOX_UV * sv;
      }
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

  const col = new THREE.Color(o.tint ?? "#ffffff");
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) col.toArray(colors, i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("wear", new THREE.BufferAttribute(wear, 1));
  for (const name of Object.keys(g.attributes)) {
    if (!["position", "normal", "uv", "color", "wear"].includes(name)) g.deleteAttribute(name);
  }
  return g;
}

/** Junta piezas ya preparadas en una geometría (un draw call). */
export function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------ primitivas propias --

/**
 * Torno: revoluciona un perfil [radio, y] alrededor de Y. Cada tramo del
 * perfil es una banda con normal propia (aristas del perfil nítidas); en la
 * vuelta las normales son suaves, o facetadas con `facet` (tuercas hexagonales).
 * UV: u = vuelta (0..1), v = largo de perfil.
 */
export function lathe(profile: [number, number][], segments: number, facet = false, phase = 0) {
  const posArr: number[] = [];
  const norArr: number[] = [];
  const uvArr: number[] = [];
  let len = 0;
  for (let j = 0; j < profile.length - 1; j++) {
    const [r0, y0] = profile[j];
    const [r1, y1] = profile[j + 1];
    const dr = r1 - r0;
    const dy = y1 - y0;
    const l = Math.hypot(dr, dy);
    if (l < 1e-6) continue;
    // Normal 2D del tramo (hacia afuera si el perfil va de abajo hacia arriba).
    const nr = dy / l;
    const ny = -dr / l;
    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2 + phase;
      const t1 = ((i + 1) / segments) * Math.PI * 2 + phase;
      const tm = (t0 + t1) / 2;
      const quad = [
        [r0, y0, t0, len],
        [r1, y1, t0, len + l],
        [r1, y1, t1, len + l],
        [r0, y0, t1, len],
      ];
      for (const k of [0, 2, 1, 0, 3, 2]) {
        const [r, y, t, v] = quad[k];
        const tn = facet ? tm : t;
        posArr.push(Math.sin(t) * r, y, Math.cos(t) * r);
        norArr.push(Math.sin(tn) * nr, ny, Math.cos(tn) * nr);
        uvArr.push((t - phase) / (Math.PI * 2), v);
      }
    }
    len += l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(posArr, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(norArr, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvArr, 2));
  return g;
}

/** Extrusión con bisel de un contorno: grosor total exacto `h` sobre z ∈ [0, h]. */
export function slab(shape: THREE.Shape, h: number, bevel: number, curveSegments = 12) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(h - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments,
  });
  g.translate(0, 0, bevel);
  return g;
}

/** Rectángulo (centrado) con las esquinas achaflanadas. */
export function chamferRect(hw: number, hh: number, c: number) {
  const s = new THREE.Shape();
  s.moveTo(-hw + c, -hh);
  s.lineTo(hw - c, -hh);
  s.lineTo(hw, -hh + c);
  s.lineTo(hw, hh - c);
  s.lineTo(hw - c, hh);
  s.lineTo(-hw + c, hh);
  s.lineTo(-hw, hh - c);
  s.lineTo(-hw, -hh + c);
  s.closePath();
  return s;
}

/** Octógono de apotema `a` con caras hacia los ejes y esquinas achaflanadas `c`. */
export function octagon(a: number, c: number) {
  const s = new THREE.Shape();
  const R = a / Math.cos(Math.PI / 8);
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k < 8; k++) {
    const t = Math.PI / 8 + (k * Math.PI) / 4;
    const p = new THREE.Vector2(Math.cos(t) * R, Math.sin(t) * R);
    const prev = new THREE.Vector2(Math.cos(t - Math.PI / 4) * R, Math.sin(t - Math.PI / 4) * R);
    const next = new THREE.Vector2(Math.cos(t + Math.PI / 4) * R, Math.sin(t + Math.PI / 4) * R);
    pts.push(p.clone().lerp(prev, c / p.distanceTo(prev)), p.clone().lerp(next, c / p.distanceTo(next)));
  }
  s.setFromPoints(pts);
  s.closePath();
  return s;
}

/** Matriz a partir de posición, rotación Euler (XYZ) y escala uniforme. */
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(s, s, s),
  );
}
