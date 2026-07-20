import { motion } from "motion/react";
import { SKILL_GROUPS } from "../../data";
import { Reveal, containerVariants, itemVariants } from "../Reveal";

export default function Skills() {
  return (
    <section id="habilidades" className="section-shell">
      <Reveal>
        <p className="eyebrow text-brand-skills">Habilidades</p>
        <h2 className="section-title">Tecnologías que domino</h2>
      </Reveal>

      <motion.div
        className="mt-10 grid gap-6 md:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
      >
        {SKILL_GROUPS.map((group) => (
          <motion.div key={group.title} className="card" variants={itemVariants}>
            <h3 className="font-display text-lg font-semibold text-heading">
              {group.title}
            </h3>
            <ul className="mt-5 space-y-4">
              {group.skills.map((skill) => (
                <li key={skill.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-body">{skill.name}</span>
                    <span className="text-muted">{skill.level}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={skill.level}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Nivel de ${skill.name}`}
                    className="h-1.5 overflow-hidden rounded-full bg-border/5"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-skills to-brand-skills/60"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
