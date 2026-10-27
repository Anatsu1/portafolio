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
import { usePaintSettled } from "./hooks/usePaintSettled";

// Tope de espera por la celda 3D: si algo falla o la conexión es muy lenta, las
// puertas se abren igual (la celda es opcional, la página tiene que abrir).
const CELL_SAFETY_MS = 30_000;

export default function App() {
  const [heroReady, setHeroReady] = useState(false);
  const [cellReady, setCellReady] = useState(false);
  // El brazo del Hero (video + texto) arranca cuando las puertas están por terminar de abrirse.
  const [heroGo, setHeroGo] = useState(false);
  const cellSupported = useCellSupport();
  const preload = useCellPreload(cellSupported);

  useEffect(() => {
    if (!cellSupported) return;
    const safety = window.setTimeout(() => setCellReady(true), CELL_SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, [cellSupported]);

  // Las puertas del vault se abren cuando el Hero Y la celda 3D (modelos
  // cargados, shaders compilados, primer cuadro dibujado) están listos, y la
  // página ya terminó de pintarse. Se prefiere un loader un poco más largo a
  // abrir enseguida y que la escena se arme (y trabe el scroll) con la página
  // a la vista.
  const ready = usePaintSettled(heroReady && (!cellSupported || cellReady));

  return (
    <MotionConfig reducedMotion="user">
      <PageLoader visible={!ready} progress={cellSupported ? (cellReady ? 1 : preload.progress * 0.97) : undefined} onNearlyOpen={() => setHeroGo(true)} />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero onReady={() => setHeroReady(true)} go={heroGo} labAvailable />
        <Celda supported={cellSupported} onReady={() => setCellReady(true)} mountScene />
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
