export const OWNER = {
  name: "César Augusto Fernández Carbonell",
  shortName: "César Fernández",
  role: "Desarrollador de Software Full Stack",
  email: "cesar.fernandez@example.com", // TODO: reemplazar con tu correo real
  location: "Argentina",
  github: "https://github.com/tu-usuario",
  linkedin: "https://www.linkedin.com/in/tu-usuario",
  cvUrl: "/cv-cesar-fernandez.pdf",
};

export const NAV_LINKS = [
  { id: "inicio", label: "Inicio" },
  { id: "sobre-mi", label: "Sobre mí" },
  { id: "habilidades", label: "Habilidades" },
  { id: "proyectos", label: "Proyectos" },
  { id: "contacto", label: "Contacto" },
] as const;

export type Skill = { name: string; level: number };

export const SKILL_GROUPS: { title: string; skills: Skill[] }[] = [
  {
    title: "Frontend",
    skills: [
      { name: "TypeScript", level: 90 },
      { name: "JavaScript (ES2023)", level: 95 },
      { name: "React", level: 90 },
      { name: "HTML5 / CSS3", level: 95 },
      { name: "Tailwind CSS", level: 85 },
    ],
  },
  {
    title: "Backend",
    skills: [
      { name: "Node.js / Express", level: 85 },
      { name: "REST / GraphQL", level: 80 },
      { name: "PostgreSQL", level: 75 },
      { name: "MongoDB", level: 70 },
    ],
  },
  {
    title: "Herramientas",
    skills: [
      { name: "Git / GitHub", level: 90 },
      { name: "Vite / Webpack", level: 80 },
      { name: "Docker", level: 65 },
      { name: "Testing (Vitest / Jest)", level: 70 },
    ],
  },
];

export type Project = {
  title: string;
  description: string;
  tags: string[];
  demo?: string;
  repo?: string;
};

export const PROJECTS: Project[] = [
  {
    title: "Panel de gestión de tareas",
    description:
      "Aplicación tipo kanban con arrastrar y soltar, autenticación y sincronización en tiempo real.",
    tags: ["React", "TypeScript", "Tailwind", "Node.js"],
    demo: "#",
    repo: "#",
  },
  {
    title: "E-commerce de indumentaria",
    description:
      "Tienda en línea con carrito, pasarela de pago y panel de administración de productos.",
    tags: ["React", "Express", "PostgreSQL", "Stripe"],
    demo: "#",
    repo: "#",
  },
  {
    title: "Dashboard de analíticas",
    description:
      "Visualización de métricas de negocio con gráficos interactivos y reportes exportables.",
    tags: ["TypeScript", "Recharts", "REST API"],
    demo: "#",
    repo: "#",
  },
];
