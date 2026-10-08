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
import Projects from "./components/sections/Projects";
import Contact from "./components/sections/Contact";
import { useCellSupport } from "./hooks/useCellSupport";
import { useCellPreload } from "./hooks/useCellPreload";

// Tope de espera por la celda 3D: si algo falla o la conexión es muy lenta, las
// puertas se abren igual (la celda es opcional, la página tiene que abrir).
const CELL_SAFETY_MS = 30_000;

export default function App() {
  const [heroReady, setHeroReady] = useState(false);
  const [cellReady, setCellReady] = useState(false);
  const cellSupported = useCellSupport();
  const preload = useCellPreload(cellSupported);

  useEffect(() => {
    if (!cellSupported) return;
    const safety = window.setTimeout(() => setCellReady(true), CELL_SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, [cellSupported]);

  // Las puertas del vault se abren cuando el Hero está listo Y (si hay celda
  // 3D) sus modelos están cargados y la escena ya dibujó su primer cuadro.
  const ready = heroReady && (!cellSupported || cellReady);

  return (
    <MotionConfig reducedMotion="user">
      <PageLoader visible={!ready} progress={cellSupported ? (cellReady ? 1 : preload.progress * 0.97) : undefined} />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero onReady={() => setHeroReady(true)} go={ready} labAvailable={cellSupported} />
        <Celda supported={cellSupported} onReady={() => setCellReady(true)} />
        <MarqueeBand />
        <About />
        <Trayectoria />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  );
}
