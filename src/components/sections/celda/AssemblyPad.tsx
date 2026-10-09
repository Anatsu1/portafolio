import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lathe, mat, merge, part, robotMaterials, slab } from "./robotMetal";
import { chaseTexture } from "./assemblyFloorTextures";
import { PAD_HOLE_R, floorMaterials } from "./AssemblyFloor";
import { ARC_RADIUS } from "./cellLayout";
import type { Theme } from "./assemblyTextures";

/*
 * Plataforma del brazo en la línea de montaje: una mesa giratoria industrial
 * embutida en el piso (reemplaza a CellPad solo en este entorno; el bosque
 * sigue usando CellPad). Cara superior en y = 0, donde están calibrados el
 * brazo y las cajas; lo único que sobresale es el aro de seguridad (+6 mm) y
 * el borde con tornillos (+8 mm).
 *
 * Del centro hacia afuera (radios):
 *   0 … 1,0     maza bajo el pedestal
 *   1,0 … 1,14  aro del rodamiento con su círculo de bulones
 *   1,16 … 2,5  12 chapas de cubierta biseladas, separadas por juntas reales
 *   2,5 … 2,62  canal embutido con la luz de alcance (color `rim`)
 *   2,62 … 3,05 tramos alternados de rejilla y chapa semillada
 *   3,05 … 3,25 aro de seguridad amarillo/negro
 *   3,25 … 3,40 borde con 48 bulones y luz perimetral en el canto
 *   3,40 … 3,47 luz entre mesa y piso: corona dentada de la mesa a la vista
 *   3,47 … 3,58 marco de ángulo embutido en el piso, atornillado
 *
 * Mismo acero y desgaste que el brazo (robotMetal). Draw calls: acero, franjas,
 * chapa semillada, rejilla, pozo, luz de alcance, luz perimetral = 7.
 */

const DECK_DARK = "#43494d";
const DECK_LIGHT = "#8e959a";
const BOLT = "#a3a8ac";
const MACHINED = "#6f7478";

/** Sector de corona circular (ángulos en el plano del piso, como cellLayout) con junta `gap`. */
function sector(r0: number, r1: number, a0: number, a1: number, gap: number) {
  const s = new THREE.Shape();
  const g1 = gap / 2 / r1;
  const g0 = gap / 2 / r0;
  s.moveTo(Math.cos(a0 + g1) * r1, Math.sin(a0 + g1) * r1);
  s.absarc(0, 0, r1, a0 + g1, a1 - g1, false);
  s.lineTo(Math.cos(a1 - g0) * r0, Math.sin(a1 - g0) * r0);
  s.absarc(0, 0, r0, a1 - g0, a0 + g0, true);
  s.closePath();
  return s;
}

/**
 * `lathe` orienta la normal según el sentido del perfil: para que las caras de
 * arriba miren hacia arriba el perfil tiene que ir de afuera hacia adentro.
 * Los perfiles se escriben de adentro hacia afuera (se leen mejor) y se dan vuelta.
 */
const inward = (p: [number, number][]) => [...p].reverse();

/** Placa plana (rotada al piso) con su cara de arriba en `top`. */
const flat = (top: number, h: number) => mat(0, top - h, 0, -Math.PI / 2);

function bolt(list: THREE.BufferGeometry[], x: number, y: number, z: number, s: number) {
  list.push(part(lathe([[0.03 * s, 0], [0.03 * s, 0.006 * s], [0.026 * s, 0.009 * s], [0, 0.009 * s]], 10), mat(x, y, z), { tint: BOLT, capAxis: "y", edge: 0 }));
  list.push(part(lathe([[0.021 * s, 0.009 * s], [0.021 * s, 0.022 * s], [0.015 * s, 0.028 * s], [0, 0.028 * s]], 6, true), mat(x, y, z), { tint: BOLT, capAxis: "y", edge: 0 }));
}

/** Tornillo avellanado (al ras): solo un disco apenas bombeado. */
function flushScrew(list: THREE.BufferGeometry[], x: number, y: number, z: number) {
  list.push(part(lathe([[0.018, 0], [0.016, 0.0025], [0, 0.003]], 8), mat(x, y, z), { tint: MACHINED, capAxis: "y", edge: 0, wear: 2 }));
}

/** Corona dentada (contorno con dientes hacia afuera). */
function gearRing(teeth: number, inner: number, root: number, tip: number) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const t = i * step;
    const pts: [number, number][] = [
      [root, t - step * 0.32],
      [tip, t - step * 0.16],
      [tip, t + step * 0.16],
      [root, t + step * 0.32],
    ];
    pts.forEach(([r, a], j) => (i === 0 && j === 0 ? s.moveTo(Math.cos(a) * r, Math.sin(a) * r) : s.lineTo(Math.cos(a) * r, Math.sin(a) * r)));
  }
  s.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, inner, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

function buildPad(theme: Theme) {
  const deck = theme === "dark" ? DECK_DARK : DECK_LIGHT;
  const deck2 = new THREE.Color(deck).multiplyScalar(0.9).getStyle();
  const steel: THREE.BufferGeometry[] = [];
  const hazard: THREE.BufferGeometry[] = [];
  const tread: THREE.BufferGeometry[] = [];
  const grate: THREE.BufferGeometry[] = [];
  const pit: THREE.BufferGeometry[] = [];

  // Pozo bajo la mesa (se ve por las rejillas y por la luz del borde).
  const bottom = new THREE.CircleGeometry(PAD_HOLE_R, 72).rotateX(-Math.PI / 2).translate(0, -0.12, 0);
  const wall = new THREE.CylinderGeometry(PAD_HOLE_R, PAD_HOLE_R, 0.11, 96, 1, true).translate(0, -0.065, 0);
  pit.push(bottom.toNonIndexed(), wall.toNonIndexed());
  bottom.dispose();
  wall.dispose();
  // Bastidor bajo las chapas (se ve oscuro en las juntas).
  steel.push(part(lathe(inward([[0, -0.03], [2.62, -0.03]]), 96), mat(), { tint: "#1c1f21", capAxis: "y", edge: 0 }));
  // Rayos del bastidor bajo la rejilla.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    steel.push(part(new THREE.BoxGeometry(0.46, 0.08, 0.03), mat(Math.cos(a) * 2.84, -0.05, -Math.sin(a) * 2.84, 0, a), { tint: "#2a2e31", edge: 0 }));
  }

  // Maza central y aro del rodamiento.
  steel.push(part(slab(sector(0.02, 1.0, 0, Math.PI * 2 - 1e-4, 0), 0.03, 0.004, 48), flat(0, 0.03), { tint: deck2 }));
  steel.push(part(lathe(inward([[1.0, -0.004], [1.0, 0.002], [1.008, 0.004], [1.132, 0.004], [1.14, 0.002], [1.14, -0.004]]), 96), mat(), { tint: MACHINED, capAxis: "y", wear: 2 }));
  for (let i = 0; i < 24; i++) {
    const a = ((i + 0.5) / 24) * Math.PI * 2;
    bolt(steel, Math.cos(a) * 1.07, 0.004, -Math.sin(a) * 1.07, 0.6);
  }

  // Chapas de cubierta: 12 sectores biselados con tornillos avellanados en los bordes.
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = ((i + 1) / N) * Math.PI * 2;
    steel.push(part(slab(sector(1.16, 2.5, a0, a1, 0.016), 0.03, 0.006, 10), flat(0, 0.03), { tint: i % 2 ? deck : deck2, uvScale: [0.5, 0.5] }));
    for (const r of [1.3, 1.83, 2.36]) {
      for (const a of [a0 + 0.045 / r * 1.0, a1 - 0.045 / r]) flushScrew(steel, Math.cos(a) * r, 0, -Math.sin(a) * r);
    }
  }

  // Canal de la luz de alcance.
  steel.push(part(lathe(inward([[2.5, -0.004], [2.5, -0.014], [2.62, -0.014], [2.62, -0.004]]), 128), mat(), { tint: "#202427", capAxis: "y", edge: 0 }));

  // Anillo exterior: rejilla y chapa semillada alternadas.
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2;
    const a1 = ((i + 1) / 16) * Math.PI * 2;
    if (i % 2 === 0) {
      const g = new THREE.ShapeGeometry(sector(2.63, 3.04, a0, a1, 0.03), 8);
      // uv del ShapeGeometry = (x, y) del contorno: escala de la rejilla en unidades
      const uv = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 2, uv.getY(k) * 2);
      g.rotateX(-Math.PI / 2).translate(0, -0.004, 0);
      grate.push(g.toNonIndexed());
      g.dispose();
      // marco del tramo de rejilla
      steel.push(part(slab(sector(2.62, 3.05, a0, a1, 0.012), 0.012, 0.003, 8).clone(), flat(-0.012, 0.012), { tint: "#2a2e31", edge: 0 }));
    } else {
      tread.push(part(slab(sector(2.62, 3.05, a0, a1, 0.014), 0.02, 0.005, 8), flat(0, 0.02), { tint: theme === "dark" ? "#7d8589" : "#9aa1a5", uvScale: [2.9, 2.9] }));
    }
  }

  // Aro de seguridad, biselado.
  hazard.push(part(lathe(inward([[3.05, -0.004], [3.06, 0.006], [3.24, 0.006], [3.25, -0.004]]), 160), mat(), { uv: "keep", uvScale: [26, 2.4], capAxis: "y", edge: 0 }));

  // Borde con bulones y canto vertical (allí va la luz perimetral).
  steel.push(part(lathe(inward([[3.25, 0.0], [3.25, 0.008], [3.365, 0.008], [3.4, -0.006], [3.4, -0.05], [3.36, -0.05]]), 160), mat(), { tint: deck, capAxis: "y" }));
  for (let i = 0; i < 48; i++) {
    const a = ((i + 0.5) / 48) * Math.PI * 2;
    bolt(steel, Math.cos(a) * 3.305, 0.008, -Math.sin(a) * 3.305, 0.55);
  }

  // Corona dentada a la vista en la luz entre mesa y piso.
  steel.push(part(slab(gearRing(200, 3.3, 3.41, 3.452), 0.025, 0, 1), flat(-0.035, 0.025), { tint: MACHINED, wear: 2 }));

  // Marco embutido en el piso.
  steel.push(part(lathe(inward([[3.47, -0.07], [3.47, -0.006], [3.478, -0.003], [3.58, -0.003], [3.58, -0.01]]), 160), mat(), { tint: "#555b5f", capAxis: "y" }));
  for (let i = 0; i < 36; i++) {
    const a = ((i + 0.25) / 36) * Math.PI * 2;
    flushScrew(steel, Math.cos(a) * 3.528, -0.003, -Math.sin(a) * 3.528);
  }

  const pitGeo = merge(pit.map((g) => {
    // mismos atributos que exige mergeGeometries
    for (const n of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(n)) g.deleteAttribute(n);
    return g;
  }));
  const grateGeo = merge(grate);
  return { steel: merge(steel), hazard: merge(hazard), tread: merge(tread), grate: grateGeo, pit: pitGeo };
}

/** Anillo plano entre dos radios (luces). */
function ringGeo(r0: number, r1: number, y: number) {
  return new THREE.RingGeometry(r0, r1, 160, 1).rotateX(-Math.PI / 2).translate(0, y, 0);
}

export default function AssemblyPad({ theme, rim }: { theme: Theme; rim: string }) {
  const dark = theme === "dark";
  const parts = useMemo(() => buildPad(theme), [theme]);
  useEffect(() => () => Object.values(parts).forEach((g) => g.dispose()), [parts]);
  const m = robotMaterials();
  const fm = floorMaterials();

  const guide = useMemo(() => ringGeo(ARC_RADIUS + 0.55, ARC_RADIUS + 0.59, -0.01), []);
  // Luz perimetral: un cilindro abierto sobre el canto, con trazos que corren.
  const perimeter = useMemo(() => new THREE.CylinderGeometry(3.402, 3.402, 0.02, 160, 1, true).translate(0, -0.022, 0), []);
  const chase = useMemo(() => {
    const t = chaseTexture();
    t.repeat.set(24, 1);
    return t;
  }, []);
  useEffect(
    () => () => {
      guide.dispose();
      perimeter.dispose();
      chase.dispose();
    },
    [guide, perimeter, chase],
  );
  useFrame((state) => {
    chase.offset.x = (state.clock.elapsedTime * 0.06) % 1;
  });

  return (
    <group>
      <mesh geometry={parts.pit} material={fm.pit} />
      <mesh geometry={parts.steel} material={m.steel} />
      <mesh geometry={parts.hazard} material={m.hazard} />
      <mesh geometry={parts.tread} material={fm.tread} />
      <mesh geometry={parts.grate} material={fm.grate} />
      <mesh geometry={guide}>
        <meshBasicMaterial color={rim} toneMapped={false} transparent opacity={dark ? 0.85 : 0.7} />
      </mesh>
      <mesh geometry={perimeter}>
        <meshBasicMaterial color={rim} map={chase} toneMapped={false} transparent opacity={dark ? 1 : 0.8} />
      </mesh>
    </group>
  );
}
