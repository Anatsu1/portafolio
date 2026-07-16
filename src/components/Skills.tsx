import { SKILL_GROUPS } from "../data";

export default function Skills() {
  return (
    <section id="habilidades" className="section-shell">
      <p className="eyebrow">Habilidades</p>
      <h2 className="section-title">Tecnologías que domino</h2>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {SKILL_GROUPS.map((group) => (
          <div key={group.title} className="card">
            <h3 className="font-display text-lg font-semibold text-white">
              {group.title}
            </h3>
            <ul className="mt-5 space-y-4">
              {group.skills.map((skill) => (
                <li key={skill.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{skill.name}</span>
                    <span className="text-slate-500">{skill.level}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={skill.level}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Nivel de ${skill.name}`}
                    className="h-1.5 overflow-hidden rounded-full bg-white/5"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-300"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
