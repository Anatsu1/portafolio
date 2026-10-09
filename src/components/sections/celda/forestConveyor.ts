import * as THREE from "three";
import { groundHeight } from "./forestScatter";
import { BELT, BELT_DIR, BELT_LEN, CONTAINER, STATION } from "./forestSite";
import { beltTexture } from "./forestIndustryTextures";
import { type Parts, atlasPlane, box, cylZ, lathePart, strut } from "./forestParts";

/*
 * Cinta transportadora del puesto de campo: sale del contenedor del fondo,
 * corre junto al sendero y termina en la estación de recepción, al borde del
 * claro. Las cajas de carga (la misma caja del brazo en versión liviana,
 * `caja-lite.glb`) viajan sobre ella con instancing: un draw call para todas.
 *
 * Como en la línea de montaje (assemblyPath.ts), la posición de cada caja es
 * una función pura del tiempo: el bucle es perfecto y cualquier instante se
 * puede reproducir. Las cajas nacen detrás de la cortina de tiras del
 * contenedor y desaparecen dentro de la estación (la cámara ve su espalda).
 *
 * Marco local de la cinta: +X = sentido de avance (de FAR a NEAR), origen en
 * FAR sobre la banda, +Y arriba. La banda puede tener una leve pendiente
 * (sigue al terreno, más alto al fondo).
 */

const W = BELT.width;
const BOX_SCALE = 0.235; // como en la línea de montaje (la caja del brazo usa 0,26)

/** Altura de la banda en cada punta: al fondo el terreno sube un poco. */
const Y_FAR = groundHeight(CONTAINER.at[0], CONTAINER.at[1]) + BELT.top;
const Y_NEAR = groundHeight(BELT.near[0], BELT.near[1]) + BELT.top;
const YAW = Math.atan2(-BELT_DIR[1], BELT_DIR[0]);
const PITCH = Math.atan2(Y_NEAR - Y_FAR, BELT_LEN);
/** Largo de la banda dibujada: entra 0,3 en la estación. */
const DRAWN = BELT_LEN + 0.35;

/** Matriz del marco local de la cinta. */
export const BELT_FRAME = new THREE.Matrix4().compose(
  new THREE.Vector3(BELT.far[0], Y_FAR, BELT.far[1]),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, YAW, PITCH, "YZX")),
  new THREE.Vector3(1, 1, 1),
);

/** Punto (mundo) de la banda a la distancia `s` desde FAR. */
function beltPoint(s: number, out = new THREE.Vector3()) {
  return out.set(s, 0, 0).applyMatrix4(BELT_FRAME);
}

const local = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
  BELT_FRAME.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));

const STEEL = "#4d5256";
const DARK = "#34383b";
const MACHINED = "#7a7f83";

/** Bastidor, rodillos, patas, motor y la estación de recepción (geometría fija). */
export function conveyorParts(p: Parts) {
  const cx = DRAWN / 2;
  // Largueros en C a los costados y guardas con franjas encima.
  for (const side of [-1, 1]) {
    p.steel.push(box(DRAWN, 0.17, 0.05, local(cx, -0.085, side * (W / 2 + 0.04)), STEEL, 0.008));
    p.hazard.push(box(DRAWN, 0.05, 0.035, local(cx, 0.045, side * (W / 2 + 0.05)), "#ffffff", 0.006, [3, 3]));
  }
  // Bandeja inferior y tambores en las puntas.
  p.steel.push(box(DRAWN, 0.025, W, local(cx, -0.16, 0), DARK, 0.004));
  for (const x of [0.02, DRAWN - 0.02]) p.steel.push(cylZ(0.075, W + 0.02, local(x, -0.075, 0), MACHINED, 16, 2));
  // Rodillos de retorno (se ven por abajo, entre las patas).
  for (let x = 0.7; x < DRAWN - 0.4; x += 1.1) p.steel.push(cylZ(0.035, W, local(x, -0.21, 0), MACHINED, 10, 2));

  // Patas: dos postes por lado, travesaño y placa de apoyo, siempre verticales.
  const pt = new THREE.Vector3();
  for (let s = 0.9; s < BELT_LEN - 0.8; s += 1.55) {
    beltPoint(s, pt);
    const nx = -BELT_DIR[1];
    const nz = BELT_DIR[0];
    const top = pt.y - 0.17;
    for (const side of [-1, 1]) {
      const x = pt.x + nx * side * (W / 2 + 0.03);
      const z = pt.z + nz * side * (W / 2 + 0.03);
      const gy = groundHeight(x, z) - 0.04;
      p.steel.push(strut(new THREE.Vector3(x, gy, z), new THREE.Vector3(x, top, z), 0.055, DARK));
      p.steel.push(box(0.17, 0.03, 0.17, new THREE.Matrix4().makeRotationY(YAW).setPosition(x, gy + 0.03, z), STEEL, 0.005));
    }
    const gy = groundHeight(pt.x, pt.z);
    p.steel.push(
      strut(
        new THREE.Vector3(pt.x - nx * (W / 2 + 0.03), gy + 0.22, pt.z - nz * (W / 2 + 0.03)),
        new THREE.Vector3(pt.x + nx * (W / 2 + 0.03), gy + 0.22, pt.z + nz * (W / 2 + 0.03)),
        0.04,
        DARK,
      ),
    );
  }

  // Motorreductor al costado de la punta cercana (lado este, el que ve la cámara).
  const mz = -(W / 2 + 0.2);
  p.steel.push(box(0.26, 0.2, 0.16, local(BELT_LEN - 0.95, -0.1, mz), STEEL, 0.015));
  p.steel.push(cylZ(0.085, 0.3, local(BELT_LEN - 0.95, -0.1, mz - 0.22), DARK, 18, 0));
  p.steel.push(cylZ(0.09, 0.025, local(BELT_LEN - 0.95, -0.1, mz - 0.38), MACHINED, 18, 0));

  stationParts(p);
}

/**
 * Estación de recepción: un gabinete que abraza la punta de la cinta. La boca
 * (con cortina de tiras de goma) mira al contenedor; la cara que ve la cámara
 * lleva la placa, una franja de luz y la baliza encima.
 */
function stationParts(p: Parts) {
  const x0 = BELT_LEN - STATION.len / 2; // boca
  const x1 = BELT_LEN + STATION.len / 2; // fondo
  const cx = (x0 + x1) / 2;
  const gy = -Y_NEAR + groundHeight(STATION.at[0], STATION.at[1]); // suelo en el marco local
  const h = 1.15;
  const yc = gy + h / 2;
  const half = 0.6;
  for (const side of [-1, 1]) p.steel.push(box(STATION.len, h, 0.07, local(cx, yc, side * half), STEEL, 0.02));
  p.steel.push(box(0.07, h, half * 2, local(x1, yc, 0), STEEL, 0.02));
  p.steel.push(box(STATION.len + 0.12, 0.08, half * 2 + 0.12, local(cx, gy + h + 0.04, 0), DARK, 0.02));
  p.steel.push(box(STATION.len + 0.1, 0.1, half * 2 + 0.1, local(cx, gy + 0.05, 0), DARK, 0.02));
  // Marco de la boca con franjas y cortina de tiras.
  for (const side of [-1, 1]) p.hazard.push(box(0.1, h - 0.05, 0.1, local(x0, yc, side * (half - 0.02)), "#ffffff", 0.01, [2, 2]));
  p.hazard.push(box(0.1, 0.36, half * 2, local(x0, 0.55 + 0.18, 0), "#ffffff", 0.01, [2, 2]));
  for (let i = 0; i < 6; i++) {
    const z = -half + 0.13 + i * ((half * 2 - 0.26) / 5);
    p.cable.push(box(0.012, 0.53, 0.17, local(x0 + 0.02, 0.27, z), "#ffffff", 0));
  }
  // Placa y franja de luz en la cara que mira a la cámara (+X local).
  p.atlas.push(atlasPlane(0.62, 0.46, "station", local(x1 + 0.036, gy + 0.78, 0, 0, Math.PI / 2, 0)));
  p.glow.push(box(0.02, 0.035, half * 2 - 0.2, local(x1 + 0.04, gy + 0.42, 0), "#ffd9a0", 0));
  // Baliza giratoria (la luz que gira la anima forestIndustry) y antenita.
  p.steel.push(lathePart([[0.075, 0], [0.075, 0.04], [0.06, 0.05], [0, 0.05]], local(cx + 0.25, gy + h + 0.08, -0.3), DARK, 16));
  p.glow.push(lathePart([[0.055, 0], [0.055, 0.1], [0.04, 0.14], [0, 0.155]], local(cx + 0.25, gy + h + 0.13, -0.3), "#ffa21f", 14));
  p.steel.push(strut(new THREE.Vector3().applyMatrix4(local(cx - 0.35, gy + h + 0.08, 0.35)), new THREE.Vector3().applyMatrix4(local(cx - 0.35, gy + h + 0.75, 0.35)), 0.012, MACHINED));
}

/** Dónde está la baliza de la estación (mundo), para el haz que gira. */
export function stationBeacon() {
  const gy = -Y_NEAR + groundHeight(STATION.at[0], STATION.at[1]);
  return new THREE.Vector3(0, 0, 0).applyMatrix4(local(BELT_LEN + 0.25, gy + 1.15 + 0.21, -0.3));
}

// ---- Banda y cajas -----------------------------------------------------------------

/** Generador determinístico (como en assemblyPath). */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const BOX_COUNT = 5;
const S_IN = 0.15; // nacen dentro del contenedor, detrás de la cortina
const S_OUT = BELT_LEN - 0.1; // desaparecen dentro de la estación
const TRAVEL = S_OUT - S_IN;
const GAPS = Array.from({ length: BOX_COUNT }, (_, i) => 1.35 + hash(i + 3) * 1.1);
const LOOP = Math.max(GAPS.reduce((a, b) => a + b, 0), TRAVEL + 1);
const OFFSETS = GAPS.map((_, i) => GAPS.slice(0, i).reduce((a, b) => a + b, 0));

/** Cuántas cajas entraron a la estación hasta el tiempo `t`, y si una está por entrar. */
export function deliveries(t: number) {
  let count = 0;
  let busy = false;
  for (let k = 0; k < BOX_COUNT; k++) {
    const d = t * BELT.speed + OFFSETS[k];
    const lap = Math.floor(d / LOOP);
    const s = d - lap * LOOP;
    count += lap + (s > TRAVEL ? 1 : 0);
    if (s > TRAVEL - 1.2 && s <= TRAVEL) busy = true;
  }
  return { count, busy };
}

export type BoxModel = { geometry: THREE.BufferGeometry; material: THREE.Material; local: THREE.Matrix4 };

/**
 * Banda animada (la textura corre) y cajas viajando. Devuelve el grupo y la
 * función por cuadro. Las cajas comparten geometría y material del GLB (no
 * se liberan acá: son del caché de useGLTF).
 */
export function buildBelt(model: BoxModel) {
  const group = new THREE.Group();
  const tex = beltTexture();
  const TILE = 0.5;
  tex.repeat.set(DRAWN / TILE, 1);
  const beltMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 });
  const beltGeo = new THREE.PlaneGeometry(DRAWN, W).rotateX(-Math.PI / 2).translate(DRAWN / 2, 0, 0);
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.matrixAutoUpdate = false;
  belt.matrix.copy(BELT_FRAME);
  group.add(belt);

  // Altura del piso de la caja respecto de su origen (el modelo está centrado).
  model.geometry.computeBoundingBox();
  const bb = model.geometry.boundingBox!.clone().applyMatrix4(model.local);
  const lift = -bb.min.y * BOX_SCALE + 0.004;

  const boxes = new THREE.InstancedMesh(model.geometry, model.material, BOX_COUNT);
  boxes.frustumCulled = false;
  group.add(boxes);

  const o = new THREE.Object3D();
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const qBelt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, YAW, PITCH, "YZX"));

  return {
    group,
    update(t: number) {
      // offset negativo: la banda avanza hacia +X local, como las cajas.
      tex.offset.x = -((t * BELT.speed) / TILE) % 1;
      // Solo se dibujan las cajas que están sobre la cinta (las visibles van primero).
      let n = 0;
      for (let k = 0; k < BOX_COUNT; k++) {
        const d = t * BELT.speed + OFFSETS[k];
        const lap = Math.floor(d / LOOP);
        const s = d - lap * LOOP;
        if (s > TRAVEL) continue;
        beltPoint(S_IN + s, p);
        // Cada vuelta la caja vuelve un poco girada y, a veces, de espaldas.
        const jitter = (hash(k * 31 + lap * 7) - 0.5) * 0.25 + (hash(k * 13 + lap * 3) > 0.6 ? Math.PI : 0);
        q.setFromAxisAngle(o.up, jitter).premultiply(qBelt);
        o.position.copy(p).add(new THREE.Vector3(0, lift, 0));
        o.quaternion.copy(q);
        o.scale.setScalar(BOX_SCALE);
        o.updateMatrix();
        boxes.setMatrixAt(n++, m.multiplyMatrices(o.matrix, model.local));
      }
      boxes.count = n;
      boxes.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      tex.dispose();
      beltMat.dispose();
      beltGeo.dispose();
      boxes.dispose();
    },
  };
}
