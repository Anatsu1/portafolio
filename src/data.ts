export const OWNER = {
  name: "Cesar Augusto Fernandez Carbonell",
  shortName: "Cesar Fernandez",
  // Dos renglones a propósito: `role` es lo que busca un reclutador y
  // `tagline` es lo que busca un cliente particular. Separados, cada
  // audiencia encuentra lo suyo de un vistazo; juntos en una sola línea
  // larga no los leía ninguna de las dos.
  role: "Desarrollador Full Stack + IA",
  tagline: "Soluciones a medida",
  /** Año en que empecé a programar: 4.º año de la secundaria técnica (2016-2022),
   *  con C y algoritmos. Coincide con el inicio del freelance en noviembre de 2019,
   *  así que el sitio, el CV y LinkedIn cuentan los mismos años. La tira de métricas
   *  del Hero los calcula contra el año actual, así no queda un número escrito a
   *  mano que envejece solo. */
  codingSince: 2019,
  credential: "Técnico universitario en Programación",
  currentlyStudying: "Licenciatura en Inteligencia Artificial",
  email: "contacto@augustofc.com",
  location: "Argentina",
  github: "https://github.com/Anatsu1",
  linkedin: "https://www.linkedin.com/in/cesar-augusto-fernandez-carbonell/",
  cvUrl: "/cv-cesar-fernandez.pdf",
};

// Bio de la sección "Sobre mí". Un párrafo por string; `**texto**` marca
// negrita (About.tsx la renderiza). El nombre va sin tildes por la convención
// del sitio (ver OWNER.name).
export const ABOUT_PARAGRAPHS = [
  "Soy **Cesar Augusto Fernandez Carbonell**, **desarrollador de software**, Técnico Universitario en Programación y docente en la UTN. Actualmente estudio la **Licenciatura en Inteligencia Artificial**, llevando mi perfil hacia la próxima generación de soluciones tecnológicas.",
  "Me apasiona convertir ideas y problemas reales en **soluciones inteligentes**, combinando desarrollo, infraestructura, automatización e IA.",
  "No solo escribo código: **construyo, enseño y sigo aprendiendo** para crear la tecnología del futuro.",
] as const;

export const NAV_LINKS = [
  { id: "inicio", label: "Inicio" },
  { id: "sobre-mi", label: "Sobre mí" },
  { id: "proyectos", label: "Proyectos" },
  { id: "contacto", label: "Contacto" },
] as const;
