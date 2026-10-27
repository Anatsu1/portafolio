import { useState } from "react";
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

export default function App() {
  const [heroReady, setHeroReady] = useState(false);
  const cellSupported = useCellSupport();

  // Las puertas del vault se abren cuando el Hero está listo. La celda 3D ya no
  // las retiene: se descarga en paralelo y, mientras llega, su propio cartel
  // ("Cargando modelos 3D") ocupa su lugar en la página.
  const ready = heroReady;

  return (
    <MotionConfig reducedMotion="user">
      <PageLoader visible={!ready} />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero onReady={() => setHeroReady(true)} go={ready} labAvailable />
        <Celda supported={cellSupported} />
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
