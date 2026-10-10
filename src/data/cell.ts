/**
 * Cajas de la celda del brazo 3D: una por sección del portafolio. Cada una
 * trae el contenido de su panel lateral, que sale del CV y de la marca
 * personal (no se inventa nada: lo estudiado se declara "en curso").
 *
 * `target` es el id de la sección real a la que enlaza el panel. El rótulo
 * va en mayúsculas y sin tildes porque se estampa en la placa metálica de la
 * caja (estética de stencil industrial); el panel sí usa tildes.
 */

export type PanelItem = {
  title: string;
  /** Línea chica debajo del título: institución, período, rol. */
  meta?: string;
  detail?: string;
  /** Marca de estado: "en curso", "actual". */
  badge?: string;
};

export type PanelBlock = {
  heading?: string;
  items: PanelItem[];
};

export type CellBox = {
  id: string;
  label: string;
  target: string;
  /** Texto del botón al pie del panel. */
  cta: string;
  panel: {
    title: string;
    kicker: string;
    intro?: string;
    blocks: PanelBlock[];
  };
};

export const CELL_BOXES: readonly CellBox[] = [
  {
    id: "sobre-mi",
    label: "SOBRE MI",
    target: "sobre-mi",
    cta: "Leer sobre mí",
    panel: {
      title: "Sobre mí",
      kicker: "Perfil",
      intro:
        "Desarrollador Full Stack y profesor universitario de Programación en la UTN. Construyo aplicaciones web de punta a punta y me ocupo de todo el camino hasta producción: servidor, deploy y mantenimiento, en mi infraestructura y en la de mis clientes.",
      blocks: [
        {
          heading: "Qué hago",
          items: [
            { title: "Frontend", detail: "React, TypeScript, Next.js, Tailwind CSS" },
            { title: "Backend", detail: "Node.js, Express y Java con Spring Boot; APIs REST" },
            { title: "Infraestructura", detail: "VPS con Docker, Traefik y CI/CD con GitHub Actions" },
            { title: "IA y automatización", detail: "LangChain, API de OpenAI, n8n y desarrollo asistido con agentes" },
          ],
        },
      ],
    },
  },
  {
    id: "educacion",
    label: "EDUCACION",
    target: "sobre-mi",
    cta: "Ver más sobre mí",
    panel: {
      title: "Educación",
      kicker: "Formación",
      blocks: [
        {
          heading: "Estudios",
          items: [
            {
              title: "Licenciatura en Inteligencia Artificial",
              meta: "Universidad Blas Pascal · a distancia · desde 2026",
              detail: "Ciclo de articulación sobre la Tecnicatura. Finalización estimada: diciembre de 2027.",
              badge: "en curso",
            },
            {
              title: "Tecnicatura Universitaria en Programación",
              meta: "UTN · 2023 – 2025",
              detail: "Promedio 9,05. Trabajo final: la plataforma institucional de la Extensión Áulica Necochea, en equipo de cuatro.",
            },
            {
              title: "Técnico Secundario en Programación",
              meta: "EEST N.º 3 Nikola Tesla · 2016 – 2022",
            },
          ],
        },
        {
          heading: "Certificaciones",
          items: [
            { title: "Developing LLM Applications with LangChain", meta: "DataCamp · agosto 2026" },
            { title: "Working with the OpenAI API", meta: "DataCamp · agosto 2026" },
            { title: "Full Stack Python", meta: "Codo a Codo (Argentina Programa)" },
            { title: "Programación Web", meta: "Oficios Digitales (CFP N.º 403)" },
          ],
        },
      ],
    },
  },
  {
    id: "experiencia",
    label: "EXPERIENCIA",
    target: "proyectos",
    cta: "Ver mis proyectos",
    panel: {
      title: "Experiencia",
      kicker: "Trayectoria",
      blocks: [
        {
          items: [
            {
              title: "Desarrollador Full Stack · Freelance",
              meta: "Noviembre 2019 – actualidad",
              detail:
                "Aplicaciones web completas para clientes y proyectos propios, desde el modelo de datos hasta el despliegue en producción.",
              badge: "actual",
            },
            {
              title: "Profesor Universitario · UTN",
              meta: "Extensión Áulica Necochea · desde agosto 2025",
              detail:
                "Programación I (C), II (Java y POO) y IV (JavaScript, Node.js y React), Bases de Datos I y II, y Gestión del Desarrollo de Software.",
              badge: "actual",
            },
            {
              title: "Ayudante de Cátedra · Programación I",
              meta: "UTN · agosto 2024 – agosto 2025",
              detail: "Acompañamiento en prácticas y resolución de ejercicios en C.",
            },
            {
              title: "Fundador y Coordinador · Club de Robótica",
              meta: "EEST N.º 3 Nikola Tesla · desde 2021",
              detail: "Talleres de sistemas embebidos, prototipado con Arduino e impresión 3D.",
              badge: "actual",
            },
          ],
        },
      ],
    },
  },
  {
    id: "proyectos",
    label: "PROYECTOS",
    target: "proyectos",
    cta: "Ver todos los proyectos",
    panel: {
      title: "Proyectos",
      kicker: "Trabajo real",
      intro:
        "Sistemas hechos para clientes y proyectos propios, con foco en el problema resuelto y el camino completo a producción.",
      // Los ítems se arman desde PROJECTS en el panel (no se duplican acá).
      blocks: [],
    },
  },
  {
    id: "contacto",
    label: "CONTACTO",
    target: "contacto",
    cta: "Ir al formulario",
    panel: {
      title: "Contacto",
      kicker: "Hablemos",
      intro:
        "Hoy combino docencia, desarrollo y la licenciatura, y estoy abierto a proyectos y propuestas interesantes. Si tenés algo entre manos, escribime.",
      // Los enlaces salen de OWNER (email, GitHub, LinkedIn, CV).
      blocks: [],
    },
  },
] as const;
