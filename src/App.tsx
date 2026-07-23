import { useState } from "react";
import { MotionConfig } from "motion/react";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import PageLoader from "./components/layout/PageLoader";
import ScrollProgress from "./components/layout/ScrollProgress";
import Hero from "./components/sections/Hero";
import About from "./components/sections/About";
import Projects from "./components/sections/Projects";
import Contact from "./components/sections/Contact";

export default function App() {
  const [heroReady, setHeroReady] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <PageLoader visible={!heroReady} />
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero onReady={() => setHeroReady(true)} />
        <About />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  );
}
