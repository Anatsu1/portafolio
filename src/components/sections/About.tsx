import { Fragment } from "react";
import { ABOUT_PARAGRAPHS } from "../../data";
import AboutCarousel from "./about/AboutCarousel";

// Renderiza `**texto**` como <strong>; el resto queda como texto plano.
function renderRich(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-heading">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

export default function About() {
  return (
    <section id="sobre-mi" className="section-shell">
      <div className="grid gap-10 md:grid-cols-[1.5fr_1fr] md:items-center">
        <div>
          <p className="eyebrow">Sobre mí</p>
          <h2 className="section-title">Quién soy</h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-body">
            {ABOUT_PARAGRAPHS.map((p, i) => (
              <p key={i}>{renderRich(p)}</p>
            ))}
          </div>
        </div>
        <AboutCarousel />
      </div>
    </section>
  );
}
