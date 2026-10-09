import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { lathe, mat, merge, part, robotMaterials } from "./robotMetal";
import { DRAINS, floorTextures, gratingTexture, treadTextures } from "./assemblyFloorTextures";
import { PATH_LEN, pointAt, type PathPoint } from "./assemblyPath";
import type { Theme } from "./assemblyTextures";

/*
 * Piso de la nave: losa con textura única (assemblyFloorTextures) y, recortados
 * de verdad en la geometría, los huecos que le dan cuerpo: la canaleta de
 * cables (con tapas de chapa semillada y un tramo de rejilla), la rejilla de
 * servicio que corre delante de la cinta y los sumideros. Cada hueco tiene su
 * pozo oscuro, marco de ángulo de acero atornillado y, adentro, algo que se ve
 * a través de la rejilla (cables, caños).
 *
 * La plataforma del brazo (AssemblyPad) va en el hueco circular.
 *
 * Draw calls: piso, pozos, acero (marcos + tornillos + caños), tapas, rejillas,
 * cables, tira de luz = 7.
 */

export const PAD_HOLE_R = 3.58;
const FLOOR_Y = -0.01;

type Poly = [number, number][]; // [x, z]

/** Canaleta en L: sale del borde de la plataforma hacia la consola del operador. */
const TRENCH: Poly = [
  [-3.3, -1.55],
  [-5.6, -1.55],
  [-5.6, -3.4],
  [-5.2, -3.4],
  [-5.2, -1.95],
  [-3.3, -1.95],
];
const TRENCH_DEPTH = 0.2;

/** Rejilla de servicio delante del tramo frontal de la cinta. */
const STRIP = { x0: -4.0, x1: 4.0, z0: -4.48, z1: -3.93, depth: 0.14 };

const rectPoly = (x0: number, z0: number, x1: number, z1: number): Poly => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];

const HOLES: Poly[] = [
  TRENCH,
  rectPoly(STRIP.x0, STRIP.z0, STRIP.x1, STRIP.z1),
  ...DRAINS.map((d) => rectPoly(d.x - d.s / 2, d.z - d.s / 2, d.x + d.s / 2, d.z + d.s / 2)),
];

const toShapePts = (poly: Poly) => poly.map(([x, z]) => new THREE.Vector2(x, -z));

/** Losa grande con los huecos recortados. uv = (x, −z): la textura está mapeada al mundo. */
function floorGeometry() {
  const shape = new THREE.Shape(toShapePts([[-35, 35], [35, 35], [35, -35], [-35, -35]]));
  const round = new THREE.Path();
  round.absarc(0, 0, PAD_HOLE_R, 0, Math.PI * 2, true);
  shape.holes.push(round);
  for (const h of HOLES) shape.holes.push(new THREE.Path(toShapePts(h)));
  const g = new THREE.ShapeGeometry(shape, 96);
  g.rotateX(-Math.PI / 2);
  g.translate(0, FLOOR_Y, 0);
  return g;
}

/** Paredes y fondo de un pozo bajo un polígono (material de doble cara). */
function pitGeometry(poly: Poly, depth: number) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  poly.forEach(([ax, az], i) => {
    const [bx, bz] = poly[(i + 1) % poly.length];
    const nx = -(bz - az);
    const nz = bx - ax;
    const l = Math.hypot(nx, nz);
    const quad = [
      [ax, FLOOR_Y, az],
      [bx, FLOOR_Y, bz],
      [bx, -depth, bz],
      [ax, FLOOR_Y, az],
      [bx, -depth, bz],
      [ax, -depth, az],
    ];
    for (const v of quad) {
      pos.push(...v);
      nor.push(nx / l, 0, nz / l);
      uv.push(0, 0);
    }
  });
  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  walls.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  walls.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  const bottom = new THREE.ShapeGeometry(new THREE.Shape(toShapePts(poly)));
  bottom.rotateX(-Math.PI / 2);
  bottom.translate(0, -depth, 0);
  return [walls, bottom.toNonIndexed()];
}

const FRAME = "#5a6064";
const BOLT = "#9aa0a4";

/** Tornillo de cabeza plana (cabeza hexagonal baja) apoyado en y. */
function floorBolt(list: THREE.BufferGeometry[], x: number, y: number, z: number, s = 1) {
  const g = lathe([[0.017 * s, 0], [0.017 * s, 0.004 * s], [0.012 * s, 0.008 * s], [0, 0.008 * s]], 6, true);
  list.push(part(g, mat(x, y, z), { tint: BOLT, capAxis: "y", edge: 0 }));
}

/** Marco de ángulo de acero a lo largo de los bordes de un polígono, con tornillos. */
function angleFrame(list: THREE.BufferGeometry[], poly: Poly, depth: number) {
  poly.forEach(([ax, az], i) => {
    const [bx, bz] = poly[(i + 1) % poly.length];
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(-(bz - az), bx - ax);
    // Normal hacia afuera del hueco (los polígonos van en sentido horario visto desde arriba).
    const ox = -(bz - az) / len;
    const oz = (bx - ax) / len;
    const sign = isClockwise(poly) ? 1 : -1;
    const cx = (ax + bx) / 2;
    const cz = (az + bz) / 2;
    // ala horizontal: apoya sobre el piso, del lado de afuera del hueco
    list.push(part(new THREE.BoxGeometry(len + 0.1, 0.008, 0.05), mat(cx + ox * sign * 0.025, FLOOR_Y + 0.004, cz + oz * sign * 0.025, 0, yaw), { tint: FRAME, edge: 0.01 }));
    // ala vertical: tapa el canto del hueco
    list.push(part(new THREE.BoxGeometry(len, Math.min(depth, 0.07), 0.008), mat(cx - ox * sign * 0.004, FLOOR_Y - Math.min(depth, 0.07) / 2, cz - oz * sign * 0.004, 0, yaw), { tint: FRAME, edge: 0 }));
    const n = Math.max(1, Math.round(len / 0.5));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      floorBolt(list, ax + (bx - ax) * t + ox * sign * 0.027, FLOOR_Y + 0.008, az + (bz - az) * t + oz * sign * 0.027, 0.8);
    }
  });
}

function isClockwise(poly: Poly) {
  let a = 0;
  poly.forEach(([x0, z0], i) => {
    const [x1, z1] = poly[(i + 1) % poly.length];
    a += (x1 - x0) * (z1 + z0);
  });
  return a > 0;
}

/** Plano horizontal (para rejillas) con uv en unidades del mundo × `k`. */
function flatQuad(x0: number, z0: number, x1: number, z1: number, y: number, k: number) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * k, -p.getZ(i) * k);
  return g;
}

/** Tira de luz del color de marca que acompaña a la U, del lado del brazo. */
function ledGeometry() {
  const pts: number[] = [];
  const idx: number[] = [];
  const p: PathPoint = { x: 0, z: 0, yaw: 0 };
  const from = 3.1;
  const to = PATH_LEN - 3.1;
  const n = Math.ceil((to - from) / 0.15);
  for (let i = 0; i <= n; i++) {
    pointAt(from + ((to - from) * i) / n, p);
    for (const e of [1.2375, 1.2625]) pts.push(p.x + Math.sin(p.yaw) * e, FLOOR_Y + 0.006, p.z + Math.cos(p.yaw) * e);
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  return g;
}

/** Todo lo que no depende del tema (se arma una vez por montaje). */
function buildFloorParts() {
  const steel: THREE.BufferGeometry[] = [];
  const covers: THREE.BufferGeometry[] = [];
  const cables: THREE.BufferGeometry[] = [];
  const grates: THREE.BufferGeometry[] = [];

  // Pozos (canaleta, rejilla, sumideros).
  const pits = [
    ...pitGeometry(TRENCH, TRENCH_DEPTH),
    ...pitGeometry(rectPoly(STRIP.x0, STRIP.z0, STRIP.x1, STRIP.z1), STRIP.depth),
    ...DRAINS.flatMap((d) => pitGeometry(rectPoly(d.x - d.s / 2, d.z - d.s / 2, d.x + d.s / 2, d.z + d.s / 2), 0.16)),
  ];

  // Marcos de ángulo.
  angleFrame(steel, TRENCH, TRENCH_DEPTH);
  angleFrame(steel, rectPoly(STRIP.x0, STRIP.z0, STRIP.x1, STRIP.z1), STRIP.depth);
  for (const d of DRAINS) angleFrame(steel, rectPoly(d.x - d.s / 2, d.z - d.s / 2, d.x + d.s / 2, d.z + d.s / 2), 0.16);

  // Canaleta: tapas de chapa semillada sobre un reborde; un tramo con rejilla.
  const coverY = FLOOR_Y - 0.004;
  const tapa = (x0: number, z0: number, x1: number, z1: number) => {
    const g = new THREE.BoxGeometry(x1 - x0 - 0.012, 0.01, z1 - z0 - 0.012);
    covers.push(part(g, mat((x0 + x1) / 2, coverY - 0.005, (z0 + z1) / 2), { tint: "#8b9296", uvScale: [2.9, 2.9], edge: 0.012 }));
    // tornillos en las esquinas y ranura de levante
    for (const [x, z] of [[x0 + 0.05, z0 + 0.05], [x1 - 0.05, z0 + 0.05], [x0 + 0.05, z1 - 0.05], [x1 - 0.05, z1 - 0.05]]) floorBolt(steel, x, coverY, z, 0.7);
  };
  for (let x = -3.32; x > -5.2; x -= 0.62) {
    const x1 = Math.max(x - 0.62, -5.2);
    if (Math.abs(x + 4.56) < 0.05) grates.push(flatQuad(x1, -1.95, x, -1.55, coverY - 0.002, 2));
    else tapa(x1, -1.95, x, -1.55);
  }
  tapa(-5.6, -1.95, -5.2, -1.55);
  for (let z = -1.95; z > -3.4; z -= 0.5) tapa(-5.6, Math.max(z - 0.5, -3.4), -5.2, z);
  // Mazo de cables en el fondo de la canaleta (se ve por la rejilla y por las juntas).
  [-0.06, 0.0, 0.07].forEach((dz, i) => {
    const y = -TRENCH_DEPTH + 0.03 + (i % 2) * 0.02;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.2, y, -1.75 + dz),
      new THREE.Vector3(-4.4, y + 0.01, -1.76 + dz * 1.3),
      new THREE.Vector3(-5.3, y, -1.78 + dz),
      new THREE.Vector3(-5.4 + dz, y, -2.4),
      new THREE.Vector3(-5.4 + dz, y, -3.35),
    ]);
    cables.push(part(new THREE.TubeGeometry(curve, 40, 0.022, 6), mat(), { uv: "keep", uvScale: [curve.getLength() / 0.05, 1], edge: 0 }));
  });

  // Rejilla de servicio: paneles de 1 m con travesaños, y caños abajo.
  for (let x = STRIP.x0; x < STRIP.x1 - 1e-6; x += 1) {
    grates.push(flatQuad(x + 0.008, STRIP.z0, x + 1 - 0.008, STRIP.z1, FLOOR_Y - 0.006, 2));
    if (x > STRIP.x0) steel.push(part(new THREE.BoxGeometry(0.03, 0.05, STRIP.z1 - STRIP.z0), mat(x, FLOOR_Y - 0.03, (STRIP.z0 + STRIP.z1) / 2), { tint: FRAME, edge: 0 }));
  }
  const pipe = (z: number, r: number, y: number, tint: string) => {
    const g = new THREE.CylinderGeometry(r, r, STRIP.x1 - STRIP.x0, 14, 1, true).rotateZ(Math.PI / 2);
    steel.push(part(g, mat(0, y, z), { tint, uv: "keep", uvScale: [4, 8], edge: 0 }));
  };
  pipe(STRIP.z0 + 0.14, 0.045, -STRIP.depth + 0.05, "#59302a");
  pipe(STRIP.z0 + 0.3, 0.035, -STRIP.depth + 0.04, "#4d5256");
  for (let x = STRIP.x0 + 0.5; x < STRIP.x1; x += 2) {
    // abrazaderas de los caños
    steel.push(part(new THREE.BoxGeometry(0.04, 0.02, 0.4), mat(x, -STRIP.depth + 0.01, (STRIP.z0 + STRIP.z1) / 2 - 0.03), { tint: FRAME, edge: 0 }));
  }
  const strip = new THREE.CatmullRomCurve3([
    new THREE.Vector3(STRIP.x0, -STRIP.depth + 0.025, STRIP.z1 - 0.1),
    new THREE.Vector3(-1, -STRIP.depth + 0.03, STRIP.z1 - 0.12),
    new THREE.Vector3(1.5, -STRIP.depth + 0.025, STRIP.z1 - 0.09),
    new THREE.Vector3(STRIP.x1, -STRIP.depth + 0.03, STRIP.z1 - 0.11),
  ]);
  cables.push(part(new THREE.TubeGeometry(strip, 60, 0.03, 6), mat(), { uv: "keep", uvScale: [strip.getLength() / 0.05, 1], edge: 0 }));

  // Sumideros: rejilla más chica.
  for (const d of DRAINS) grates.push(flatQuad(d.x - d.s / 2, d.z - d.s / 2, d.x + d.s / 2, d.z + d.s / 2, FLOOR_Y - 0.005, 3));

  const gratesGeo = mergeGeometries(grates.map((g) => g.toNonIndexed()), false)!;
  grates.forEach((g) => g.dispose());
  const pitGeo = mergeGeometries(pits, false)!;
  pits.forEach((g) => g.dispose());
  return { steel: merge(steel), covers: merge(covers), cables: merge(cables), grates: gratesGeo, pits: pitGeo, led: ledGeometry(), floor: floorGeometry() };
}

// Materiales propios (los de acero y cables son los del brazo).
let floorMats: { grate: THREE.MeshStandardMaterial; tread: THREE.MeshStandardMaterial; pit: THREE.MeshStandardMaterial } | null = null;
export function floorMaterials() {
  if (floorMats) return floorMats;
  const tread = treadTextures();
  floorMats = {
    // La rejilla recorta los huecos con alpha-to-coverage: bordes suaves con el
    // MSAA del canvas, sin ordenar transparencias.
    grate: new THREE.MeshStandardMaterial({ map: gratingTexture(), alphaTest: 0.35, alphaToCoverage: true, metalness: 0.75, roughness: 0.45, side: THREE.DoubleSide }),
    tread: new THREE.MeshStandardMaterial({ map: tread.map, bumpMap: tread.bump, bumpScale: 1.5, metalness: 0.75, roughness: 0.42, vertexColors: true }),
    pit: new THREE.MeshStandardMaterial({ color: "#07090a", roughness: 0.95, metalness: 0.1, side: THREE.DoubleSide }),
  };
  return floorMats;
}

export default function AssemblyFloor({ theme, rim }: { theme: Theme; rim: string }) {
  const dark = theme === "dark";
  const parts = useMemo(buildFloorParts, []);
  const tex = useMemo(() => floorTextures(theme), [theme]);
  useEffect(
    () => () => {
      tex.map.dispose();
      tex.rb.dispose();
    },
    [tex],
  );
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  const m = robotMaterials();
  const fm = floorMaterials();

  return (
    <group>
      <mesh geometry={parts.floor}>
        <meshStandardMaterial
          map={tex.map}
          roughnessMap={tex.rb}
          bumpMap={tex.rb}
          bumpScale={dark ? 2.2 : 1.6}
          metalness={0.05}
          roughness={1}
          envMapIntensity={dark ? 0.28 : 0.5}
        />
      </mesh>
      <mesh geometry={parts.pits} material={fm.pit} />
      <mesh geometry={parts.steel} material={m.steel} />
      <mesh geometry={parts.covers} material={fm.tread} />
      <mesh geometry={parts.grates} material={fm.grate} />
      <mesh geometry={parts.cables} material={m.cable} />
      <mesh geometry={parts.led}>
        <meshBasicMaterial color={rim} toneMapped={false} transparent opacity={dark ? 0.9 : 0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
