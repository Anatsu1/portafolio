import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { FOREST_LAYER, SUN, buildForestKit } from "./forestKit";
import { buildPadTop } from "./forestPad";
import { buildForestIndustry } from "./forestIndustry";
import type { BoxModel } from "./forestConveyor";

type Theme = "light" | "dark";

/** Caja de carga liviana (la misma de la línea de montaje; ya está en el caché del loader). */
const BOX_URL = "/models/caja-lite.glb";

/**
 * Paleta de cada tema. Claro: mediodía con sol cálido filtrado por las copas
 * y bruma clara. Oscuro: crepúsculo azul violáceo con el sol bajo, naranja,
 * entrando de costado entre los troncos.
 */
const PALETTE = {
  light: { fog: "#d0d2b2", fogNear: 11, fogFar: 64, sky: "#e6eeff", bounce: "#6b5838", hemi: 0.6, sun: "#ffd99a", sunI: 2.7, fill: "#d9e5ff", fillI: 0.7 },
  dark: { fog: "#4a4868", fogNear: 9, fogFar: 52, sky: "#8088c8", bounce: "#2a2230", hemi: 0.62, sun: "#ff9450", sunI: 2.4, fill: "#7f8fd0", fillI: 0.45 },
} as const;

/** Primera malla del GLB de la caja, con su transformación dentro del modelo. */
function boxModel(scene: THREE.Object3D): BoxModel {
  scene.updateMatrixWorld(true);
  let found: BoxModel | null = null;
  scene.traverse((o) => {
    if (!found && o instanceof THREE.Mesh) found = { geometry: o.geometry, material: o.material as THREE.Material, local: o.matrixWorld.clone() };
  });
  if (!found) throw new Error(`${BOX_URL}: sin mallas`);
  return found;
}

/**
 * Entorno "Bosque": un puesto de campo industrial instalado en un claro de
 * bosque de hoja ancha. El bosque (árboles, sotobosque, luz moteada, haces,
 * luciérnagas al atardecer) lo arma `buildForestKit`; la plataforma de acero
 * invadida por el musgo, `buildPadTop`; la cinta, el contenedor, la consola,
 * el generador, los reflectores y los cables, `buildForestIndustry`. Acá van
 * las luces, la niebla y el tema. Todo vive en la capa FOREST_LAYER (la ve la
 * cámara principal, no la de ContactShadows).
 */
export default function Forest({ theme, rim }: { theme: Theme; rim: string }) {
  const dusk = theme === "dark";
  const p = PALETTE[theme];
  const { scene: boxScene } = useGLTF(BOX_URL);
  const built = useMemo(() => {
    const kit = buildForestKit();
    const pad = buildPadTop();
    const industry = buildForestIndustry(boxModel(boxScene));
    const group = new THREE.Group();
    group.add(kit.group, pad.group, industry.group);
    group.traverse((o) => o.layers.set(FOREST_LAYER));
    return { kit, pad, industry, group };
  }, [boxScene]);
  useEffect(
    () => () => {
      built.kit.dispose();
      built.pad.dispose();
      built.industry.dispose();
    },
    [built],
  );
  useEffect(() => {
    built.kit.setTheme(dusk);
    built.industry.setTheme(dusk, rim);
    built.pad.setRim(rim);
  }, [built, dusk, rim]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Solo desarrollo: medir el presupuesto desde las pruebas headless.
    (window as unknown as { __forest?: unknown }).__forest = { stats: () => stats(built.group) };
  }, [built]);

  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.layers.enable(FOREST_LAYER);
    return () => camera.layers.disable(FOREST_LAYER);
  }, [camera]);
  useFrame(({ clock, camera, gl }) => {
    built.kit.update(clock.elapsedTime, camera, gl.getPixelRatio());
    built.industry.update(clock.elapsedTime);
  });
  const sun = dusk ? SUN.dusk : SUN.day;

  return (
    <>
      <color attach="background" args={[p.fog]} />
      <fog attach="fog" args={[p.fog, p.fogNear, p.fogFar]} />
      <primitive object={built.group} />

      {/* Reflejos del metal del brazo y del puesto: sin un entorno luminoso se ve negro. */}
      <Environment resolution={256} key={dusk ? "f-dusk" : "f-day"}>
        <Lightformer form="rect" intensity={dusk ? 3 : 5} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} color={dusk ? "#7b84c4" : "#e3eeff"} />
        <Lightformer form="rect" intensity={dusk ? 6.5 : 5.5} position={[sun.x * 0.6, 3, sun.z * 0.6]} rotation-y={-Math.PI / 4} scale={[10, 5, 1]} color={dusk ? "#ff9a5a" : "#fff0cf"} />
        <Lightformer form="rect" intensity={dusk ? 2.2 : 3} position={[-7, 2, 5]} rotation-y={Math.PI / 3} scale={[8, 4, 1]} color={dusk ? "#46557f" : "#cfe0f2"} />
        <Lightformer form="rect" intensity={dusk ? 0.8 : 1.4} position={[0, -1, -6]} rotation-x={-Math.PI / 2.5} scale={[20, 6, 1]} color={dusk ? "#3a3048" : "#8a7550"} />
        <Lightformer form="ring" intensity={dusk ? 1.6 : 1} color={rim} position={[-6, 3, -5]} scale={3} />
        {/* reflectores del puesto: al atardecer se ven en el lomo del brazo */}
        <Lightformer form="rect" intensity={dusk ? 4 : 0.5} position={[-5, 4, -1.5]} scale={[1.2, 0.6, 1]} color="#ffd9a0" target={[0, 0, 0]} />
      </Environment>

      <hemisphereLight args={[p.sky, p.bounce, p.hemi]} />
      <directionalLight position={[sun.x, sun.y, sun.z]} intensity={p.sunI} color={p.sun} />
      <directionalLight position={[-4, 5, 6]} intensity={p.fillI} color={p.fill} />
    </>
  );
}

/** Triángulos y draw calls de lo que arma el bosque (instancias incluidas). */
function stats(group: THREE.Object3D) {
  let tris = 0;
  let calls = 0;
  const heavy: [string, number][] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh && !(o as THREE.Points).isPoints) return;
    calls++;
    if (!m.isMesh) return;
    const g = m.geometry;
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    const t = n * ((o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1);
    tris += t;
    heavy.push([`${o.parent?.name}/${n}x${(o as THREE.InstancedMesh).count ?? 1}`, Math.round(t)]);
  });
  heavy.sort((a, b) => b[1] - a[1]);
  return { tris: Math.round(tris), calls, heavy: heavy.slice(0, 14) };
}
