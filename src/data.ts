export const OWNER = {
  name: "Cesar Augusto Fernandez Carbonell",
  shortName: "Cesar Fernandez",
  role: "Desarrollador Full Stack + IA",
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
