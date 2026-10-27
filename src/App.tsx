import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import PageLoader from "./components/layout/PageLoader";
import ScrollProgress from "./components/layout/ScrollProgress";
import Hero from "./components/sections/Hero";
import Celda from "./components/sections/Celda";
import About from "./components/sections/About";
import Trayectoria from "./components/sections/Trayectoria";
import MarqueeBand from "./components/MarqueeBand";
import Nameplate from "./components/industrial/Nameplate";
import { MARQUEE_WORDS } from "./data";
import Projects from "./components/sections/Projects";
import Contact from "./components/sections/Contact";
import { useCellSupport } from "./hooks/useCellSupport";
import { useCellPreload } from "./hooks/useCellPreload";

// Margen tras abrirse las puertas antes de construir la escena 3D: el Hero está
// en plena animación de entrada y armar la escena a la vez la entrecortaba.
const SCENE_MOUNT_DELAY_MS = 3000;

export default function App() {
  const [heroReady, setHeroReady] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  // El brazo del Hero (video + texto) arranca cuando las puertas están por terminar de abrirse.
  const [heroGo, setHeroGo] = useState(false);
  const [mountScene, setMountScene] = useState(false);
  const cellSupported = useCellSupport();
  // Solo baja los archivos a la caché HTTP mientras el loader está a la vista
  // (red, sin trabajo en el hilo principal): la construcción espera a las puertas.
  useCellPreload(cellSupported);

  useEffect(() => {
    if (!doorsOpen) return;
    const t = window.setTimeout(() => setMountScene(true), SCENE_MOUNT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [doorsOpen]);

  // Las puertas del vault se abren cuando el Hero está listo; la celda 3D no las
  // retiene: se descarga mientras tanto y se monta después (ver `mountScene`).
  const ready = heroReady;

  return (
    <MotionConfig reducedMotion="user">
      <PageLoader visible={!ready} onOpened={() => setDoorsOpen(true)} onNearlyOpen={() => setHeroGo(true)} />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero onReady={() => setHeroReady(true)} go={heroGo} labAvailable />
        <Celda supported={cellSupported} mountScene={mountScene} />
        <MarqueeBand words={MARQUEE_WORDS} />
        <About />
        <Trayectoria />
        <Projects />
        <Nameplate />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  );
}
