import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import CellPad from "./CellPad";
import { FOREST_LAYER, SUN, buildForestKit } from "./forestKit";

type Theme = "light" | "dark";

/** Flores, rocas, troncos, tocones, hongos y lajas (Kenney Nature Kit, CC0; ver docs/creditos-3d.md). */
const FOREST_MODELS_URL = "/models/bosque/bosque.glb";

/**
 * Paleta de cada tema. Claro: mediodía con sol cálido filtrado por las copas
 * y bruma clara. Oscuro: crepúsculo azul violáceo con el sol bajo, naranja,
 * entrando de costado entre los troncos.
 */
const PALETTE = {
  light: {
    fog: "#d0d2b2",
    fogNear: 11,
    fogFar: 64,
    pad: "#4b4740",
    sky: "#e6eeff",
    bounce: "#6b5838",
    hemi: 0.6,
    sun: "#ffd99a",
    sunI: 2.7,
    fill: "#d9e5ff",
    fillI: 0.7,
  },
  dark: {
    fog: "#4a4868",
    fogNear: 9,
    fogFar: 52,
    pad: "#3a3739",
    sky: "#8088c8",
    bounce: "#2a2230",
    hemi: 0.62,
    sun: "#ff9450",
    sunI: 2.4,
    fill: "#7f8fd0",
    fillI: 0.45,
  },
} as const;

/**
 * Entorno "Bosque": un claro de bosque de hoja ancha, frondoso y acogedor.
 * Robles y árboles de copa redonda con raíces a la vista, arbustos, pasto con
 * flores silvestres, helechos, rocas, troncos caídos, hongos y un sendero que
 * se mete en el bosque; luz dorada moteada, haces de luz y bruma. La geometría
 * se arma una vez en `buildForestKit` con InstancedMesh; acá van luces, niebla
 * y tema (al atardecer algunas copas se vuelven otoñales y aparecen luciérnagas).
 */
export default function Forest({ theme, rim }: { theme: Theme; rim: string }) {
  const dusk = theme === "dark";
  const p = PALETTE[theme];
  const { scene: models } = useGLTF(FOREST_MODELS_URL);
  const kit = useMemo(() => buildForestKit(models), [models]);
  useEffect(() => () => kit.dispose(), [kit]);
  useEffect(() => kit.setTheme(dusk), [kit, dusk]);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.layers.enable(FOREST_LAYER);
    return () => camera.layers.disable(FOREST_LAYER);
  }, [camera]);
  useFrame(({ clock, camera, gl }) => kit.update(clock.elapsedTime, camera, gl.getPixelRatio()));
  const sun = dusk ? SUN.dusk : SUN.day;

  return (
    <>
      <color attach="background" args={[p.fog]} />
      <fog attach="fog" args={[p.fog, p.fogNear, p.fogFar]} />
      <primitive object={kit.group} />

      <CellPad color={p.pad} ring={rim} roughness={0.9} />

      {/* Reflejos del metal del brazo: sin un entorno luminoso se ve negro. */}
      <Environment resolution={256} key={dusk ? "f-dusk" : "f-day"}>
        <Lightformer form="rect" intensity={dusk ? 3 : 5} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} color={dusk ? "#7b84c4" : "#e3eeff"} />
        <Lightformer form="rect" intensity={dusk ? 6.5 : 5.5} position={[sun.x * 0.6, 3, sun.z * 0.6]} rotation-y={-Math.PI / 4} scale={[10, 5, 1]} color={dusk ? "#ff9a5a" : "#fff0cf"} />
        <Lightformer form="rect" intensity={dusk ? 2.2 : 3} position={[-7, 2, 5]} rotation-y={Math.PI / 3} scale={[8, 4, 1]} color={dusk ? "#46557f" : "#cfe0f2"} />
        <Lightformer form="rect" intensity={dusk ? 0.8 : 1.4} position={[0, -1, -6]} rotation-x={-Math.PI / 2.5} scale={[20, 6, 1]} color={dusk ? "#3a3048" : "#8a7550"} />
        <Lightformer form="ring" intensity={dusk ? 1.6 : 1} color={rim} position={[-6, 3, -5]} scale={3} />
      </Environment>

      <hemisphereLight args={[p.sky, p.bounce, p.hemi]} />
      <directionalLight position={[sun.x, sun.y, sun.z]} intensity={p.sunI} color={p.sun} />
      <directionalLight position={[-4, 5, 6]} intensity={p.fillI} color={p.fill} />
    </>
  );
}

useGLTF.preload(FOREST_MODELS_URL);
