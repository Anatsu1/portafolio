import { OWNER } from "../../data";

export default function About() {
  return (
    <section id="sobre-mi" className="section-shell">
      <p className="eyebrow">Sobre mí</p>
      <h2 className="section-title">Quién soy</h2>

      <div className="mt-6 max-w-2xl space-y-4 text-muted">
        <p>
          Soy {OWNER.name}, {OWNER.credential.toLowerCase()} y desarrollador
          freelance enfocado en el ecosistema JavaScript/TypeScript. Construyo
          aplicaciones web completas: desde interfaces con React y Tailwind
          hasta APIs con Node.js.
        </p>
        <p>
          Actualmente curso la {OWNER.currentlyStudying.toLowerCase()}, y
          estoy abierto a nuevas oportunidades: tanto proyectos freelance para
          clientes particulares como una posición de tiempo completo.
        </p>
      </div>
    </section>
  );
}
