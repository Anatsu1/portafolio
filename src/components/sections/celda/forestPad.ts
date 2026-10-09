import * as THREE from "three";
import { ARC_RADIUS } from "./cellLayout";
import { fbm, rng, smoothstep } from "./forestScatter";
import { invasionAt } from "./forestSite";
import { lathe, mat, part } from "./robotMetal";

/*
 * Plataforma del brazo en el bosque: una chapa de acero antideslizante con
 * bulones, banda de seguridad amarilla/negra y el musgo, la tierra y el pasto
 * comiéndose el borde en algunos tramos (lo orgánico invadiendo lo industrial).
 * Reemplaza a CellPad solo en este entorno (CellPad lo sigue usando la línea).
 *
 * Alturas (el brazo y las cajas están calibrados en y = 0):
 *  - cara superior en y = 0,005: por debajo del plano de ContactShadows
 *    (y = 0,01), si no las sombras de contacto quedarían tapadas;
 *  - el canto biselado baja hasta y = −0,06 (el suelo del bosque está a −0,03),
 *    así se lee como una chapa gruesa apoyada sobre la tierra.
 *
 * Todo el dibujo de la cara superior (chapas, juntas, banda, óxido, musgo) es
 * UNA textura de canvas en coordenadas de mundo; el relieve de rombos de la
 * chapa es una textura chica repetida como bumpMap. El canto y los bulones van
 * al material de acero compartido del brazo (los fusiona forestIndustry).
 */

export const PAD_R = 3.4;
const TOP_Y = 0.005;
const PLATE_R = 3.3; // radio de la cara plana; de ahí al borde, el bisel

// Radios del dibujo.
const HUB_R = 0.98; // disco central mecanizado (bajo el pedestal)
const TREAD_R = 2.78; // chapas antideslizantes hasta acá
const BAND_R0 = 2.86;
const BAND_R1 = 3.16; // banda de seguridad
const BOLT_R = 3.235; // bulones reales sobre el aro exterior

const TEX = 1024;

/** Mezcla lineal de dos colores RGB (0..255). */
const mix3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * Color (sRGB) y rugosidad/metal de la cara superior, píxel a píxel. El canvas
 * cubre x, z ∈ [−PAD_R, PAD_R] (arriba = fondo, z negativo).
 */
function padCanvases() {
  const color = document.createElement("canvas");
  color.width = color.height = TEX;
  const cctx = color.getContext("2d")!;
  const rm = document.createElement("canvas");
  rm.width = rm.height = TEX;
  const rctx = rm.getContext("2d")!;
  const img = cctx.createImageData(TEX, TEX);
  const rimg = rctx.createImageData(TEX, TEX);
  const rand = rng(51);

  // Tono propio de cada chapa (8 sectores) y de cada anillo.
  const plateTone = Array.from({ length: 16 }, () => 0.86 + rand() * 0.22);
  const STEEL = [96, 101, 106];
  const STEEL_DK = [62, 66, 70];
  const HUB = [118, 123, 127];
  const YELLOW = [217, 164, 0];
  const BLACK = [24, 24, 22];
  const MOSS = [74, 98, 38];
  const MOSS_LT = [118, 138, 58];
  const DIRT = [92, 72, 50];
  const RUST = [96, 66, 44];

  for (let py = 0; py < TEX; py++) {
    for (let px = 0; px < TEX; px++) {
      const x = ((px + 0.5) / TEX) * 2 * PAD_R - PAD_R;
      const z = ((py + 0.5) / TEX) * 2 * PAD_R - PAD_R;
      const r = Math.hypot(x, z);
      const a = Math.atan2(z, x);
      const k = (py * TEX + px) * 4;
      const grime = fbm(x * 1.3 + 7, z * 1.3 - 3, 3, 4); // manchas grandes
      const fine = fbm(x * 9, z * 9, 5, 2);
      let c: number[];
      let rough = 0.55;
      let metal = 0.75;

      if (r < HUB_R) {
        // Disco mecanizado: anillos de torneado finos.
        const lathe = 0.94 + 0.06 * Math.sin(r * 260);
        c = HUB.map((v) => v * lathe);
        rough = 0.38;
        metal = 0.9;
        if (Math.abs(r - HUB_R + 0.03) < 0.012) c = STEEL_DK; // ranura del borde
      } else if (r < TREAD_R) {
        // Chapas antideslizantes: 8 sectores en dos anillos, juntas oscuras.
        const ring = r < 1.9 ? 0 : 1;
        const sector = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8 + ring * 0.5) % 8;
        const tone = plateTone[sector + ring * 8];
        c = STEEL.map((v) => v * tone);
        const seamA = Math.abs(((((a + Math.PI) / (Math.PI * 2)) * 8 + ring * 0.5) % 1) - 0.5); // 0.5 en la junta
        const seamDist = Math.min((0.5 - seamA) * ((Math.PI * 2) / 8) * r, Math.abs(r - 1.9), r - HUB_R, TREAD_R - r);
        if (seamDist < 0.012) c = [30, 32, 34];
        else if (seamDist < 0.05) c = c.map((v) => v * (0.8 + 4 * seamDist)); // borde gastado y sucio
      } else if (r < BAND_R0) {
        c = [34, 36, 38]; // canal entre la chapa y la banda
        rough = 0.8;
      } else if (r < BAND_R1) {
        // Banda de seguridad: franjas a 45° que giran con el aro.
        const s = (a * 2.95) / 0.16 + (r - BAND_R0) / 0.16;
        c = Math.floor(s) % 2 === 0 ? YELLOW : BLACK;
        rough = 0.62;
        metal = 0.15;
        // Pintura saltada: asoma el acero.
        if (fine > 0.64 + 0.1 * Math.sin(a * 7)) {
          c = STEEL.map((v) => v * 0.9);
          rough = 0.45;
          metal = 0.8;
        }
      } else {
        c = STEEL_DK.map((v) => v * 1.15); // aro exterior
        rough = 0.5;
      }

      // Mugre general, más hacia afuera; óxido en manchas.
      const out = smoothstep(1.6, PAD_R, r);
      c = c.map((v) => v * (0.82 + 0.3 * grime) * (1 - 0.18 * out));
      // Óxido solo en pocas manchas chicas (de lejos, más manchas se leían como pintura naranja).
      const rust = smoothstep(0.7, 0.84, fbm(x * 3.3 - 11, z * 3.3 + 4, 8, 4)) * (r > HUB_R ? 1 : 0);
      if (rust > 0) {
        c = mix3(c, RUST, rust * 0.4);
        rough = Math.max(rough, 0.55 + 0.35 * rust);
        metal *= 1 - 0.6 * rust;
      }

      // Invasión vegetal: avanza desde el borde según el ángulo (con borde irregular).
      const depth = invasionAt(a);
      if (depth > 0) {
        const edge = PAD_R - depth * (0.55 + 0.9 * fbm(Math.cos(a) * 6 + 3, Math.sin(a) * 6, 13, 3)) * 1.3;
        const t = smoothstep(edge - 0.08, edge + 0.12, r + (fine - 0.5) * 0.25);
        if (t > 0) {
          const soil = fbm(x * 3 + 2, z * 3, 17, 3);
          const g = mix3(mix3(DIRT, MOSS, smoothstep(0.35, 0.6, soil)), MOSS_LT, smoothstep(0.62, 0.8, fine) * 0.7);
          c = mix3(c, g, t);
          rough = rough + (1 - rough) * t;
          metal *= 1 - t;
        }
      }
      // Musgo suelto en las juntas y en el aro exterior.
      if (r > 1.0 && fine > 0.7 && grime < 0.42) {
        const m = smoothstep(0.7, 0.8, fine) * 0.6 * (0.3 + out);
        c = mix3(c, MOSS, m);
        rough += (1 - rough) * m;
        metal *= 1 - m;
      }

      img.data[k] = c[0];
      img.data[k + 1] = c[1];
      img.data[k + 2] = c[2];
      img.data[k + 3] = 255;
      rimg.data[k] = 0;
      rimg.data[k + 1] = Math.min(255, rough * 255);
      rimg.data[k + 2] = metal * 255;
      rimg.data[k + 3] = 255;
    }
  }
  cctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);

  // Detalles a pincel: tornillos avellanados en las juntas, rayones y manchas de aceite.
  const toPx = (v: number) => ((v + PAD_R) / (2 * PAD_R)) * TEX;
  const dot = (x: number, z: number, rad: number, fill: string) => {
    cctx.fillStyle = fill;
    cctx.beginPath();
    cctx.arc(toPx(x), toPx(z), rad, 0, Math.PI * 2);
    cctx.fill();
  };
  for (let ring = 0; ring < 2; ring++) {
    const r0 = ring ? 1.9 : HUB_R;
    const r1 = ring ? TREAD_R : 1.9;
    for (let s = 0; s < 8; s++) {
      const a = ((s - ring * 0.5) / 8) * Math.PI * 2 - Math.PI;
      for (let t = 0.12; t < 0.95; t += 0.27) {
        const r = r0 + (r1 - r0) * t;
        for (const side of [-1, 1]) {
          const aa = a + (side * 0.06) / r;
          dot(Math.cos(aa) * r, Math.sin(aa) * r, 3.2, "#2a2c2e");
          dot(Math.cos(aa) * r - 0.003, Math.sin(aa) * r - 0.003, 2.2, "#9a9fa3");
        }
      }
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    dot(Math.cos(a) * 0.86, Math.sin(a) * 0.86, 4, "#2a2c2e");
    dot(Math.cos(a) * 0.86, Math.sin(a) * 0.86, 2.8, "#b4b8bb");
  }
  // Manchas de aceite y rayones de arrastre (las cajas van y vienen).
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1.1 + rand() * 1.5;
    const g = cctx.createRadialGradient(toPx(Math.cos(a) * r), toPx(Math.sin(a) * r), 0, toPx(Math.cos(a) * r), toPx(Math.sin(a) * r), 10 + rand() * 26);
    g.addColorStop(0, "rgba(10,10,8,0.35)");
    g.addColorStop(1, "rgba(10,10,8,0)");
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, TEX, TEX);
  }
  cctx.lineCap = "round";
  for (let i = 0; i < 220; i++) {
    const a = rand() * Math.PI * 2;
    const r = HUB_R + 0.1 + rand() * 1.7;
    const len = 0.05 + rand() * 0.3;
    const d = a + Math.PI / 2 + (rand() - 0.5) * 0.6; // mayormente en arco
    cctx.strokeStyle = rand() > 0.4 ? "rgba(200,205,210,0.22)" : "rgba(20,20,20,0.25)";
    cctx.lineWidth = 0.6 + rand();
    cctx.beginPath();
    cctx.moveTo(toPx(Math.cos(a) * r), toPx(Math.sin(a) * r));
    cctx.lineTo(toPx(Math.cos(a) * r + Math.cos(d) * len), toPx(Math.sin(a) * r + Math.sin(d) * len));
    cctx.stroke();
  }
  return { color, rm };
}

/** Relieve de chapa antideslizante: rombos alargados alternando ±45°. */
function treadCanvas() {
  const n = 64;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, n, n);
  const lug = (cx: number, cy: number, rot: number) => {
    for (const [dx, dy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
      ctx.save();
      ctx.translate(cx + dx, cy + dy);
      ctx.rotate(rot);
      const g = ctx.createLinearGradient(0, -5, 0, 5);
      g.addColorStop(0, "#555");
      g.addColorStop(0.5, "#fff");
      g.addColorStop(1, "#555");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  lug(16, 16, Math.PI / 4);
  lug(48, 48, Math.PI / 4);
  lug(48, 16, -Math.PI / 4);
  lug(16, 48, -Math.PI / 4);
  return c;
}

/**
 * Aro guía del alcance (como en CellPad) y la cara superior. Devuelve las
 * mallas propias de la plataforma; el canto y los bulones los agrega `padParts`.
 */
export function buildPadTop() {
  const { color, rm } = padCanvases();
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(rm);
  rough.anisotropy = 8;
  const tread = new THREE.CanvasTexture(treadCanvas());
  tread.wrapS = tread.wrapT = THREE.RepeatWrapping;
  tread.repeat.set(95, 95); // un rombo cada ~3,6 cm
  tread.anisotropy = 8;

  const topMat = new THREE.MeshStandardMaterial({
    map,
    roughnessMap: rough,
    metalnessMap: rough,
    roughness: 1,
    metalness: 1,
    bumpMap: tread,
    bumpScale: 0.6,
  });
  const topGeo = new THREE.CircleGeometry(PLATE_R, 128);
  // UV en coordenadas de mundo: el canvas cubre todo PAD_R (no solo PLATE_R).
  {
    const pos = topGeo.attributes.position;
    const uv = topGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + PAD_R) / (2 * PAD_R), (pos.getY(i) + PAD_R) / (2 * PAD_R));
  }
  const top = new THREE.Mesh(topGeo, topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = TOP_Y;

  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false });
  const ringGeo = new THREE.RingGeometry(ARC_RADIUS + 0.55, ARC_RADIUS + 0.59, 128);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = TOP_Y + 0.002;

  const group = new THREE.Group();
  group.name = "forest-pad";
  group.add(top, ring);
  return {
    group,
    setRim(rim: string) {
      ringMat.color.set(rim);
    },
    dispose() {
      [map, rough, tread, topMat, topGeo, ringMat, ringGeo].forEach((d) => d.dispose());
    },
  };
}

type SteelParts = { steel: THREE.BufferGeometry[] };

/** Canto biselado y bulones del aro exterior (van al acero compartido). */
export function padParts(p: SteelParts) {
  p.steel.push(
    part(
      lathe(
        [
          [PLATE_R, TOP_Y],
          [PLATE_R + 0.05, TOP_Y - 0.008],
          [PAD_R, -0.03],
          [PAD_R, -0.065],
        ],
        128,
      ),
      mat(),
      { tint: "#55595d", capAxis: "y" },
    ),
  );
  const washer = lathe([[0.034, 0], [0.034, 0.005], [0.029, 0.008], [0, 0.008]], 10);
  const head = lathe([[0.024, 0.008], [0.024, 0.02], [0.018, 0.026], [0, 0.026]], 6, true);
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = ((i + 0.5) / n) * Math.PI * 2;
    // Donde avanza el musgo los bulones quedan tapados.
    if (invasionAt(a) > 0.3) continue;
    const m = mat(Math.cos(a) * BOLT_R, TOP_Y, Math.sin(a) * BOLT_R, 0, -a + i * 0.7);
    p.steel.push(part(washer.clone(), m, { tint: "#8f9498", capAxis: "y", edge: 0 }));
    p.steel.push(part(head.clone(), m, { tint: "#a3a8ac", capAxis: "y", edge: 0 }));
  }
  washer.dispose();
  head.dispose();
}
