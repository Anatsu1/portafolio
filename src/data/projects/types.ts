/**
 * "formacion" = trabajos de cursos y bootcamps (sello "Certificación").
 * Los trabajos de la carrera no tienen rol propio: la tesis de la UTN va
 * como "cliente", porque la universidad hizo de comitente real del sistema
 * y eso es lo que le dice algo a quien mira el portafolio.
 */
export type ProjectRole = "cliente" | "personal" | "formacion";
/** "preview" = proyecto terminado cuya demo online está en modo estático
 *  (sin backend levantado) hasta volver a montar los servicios. */
export type ProjectStatus = "activo" | "en-progreso" | "preview";

export type ProjectMedia = {
  type: "image" | "video";
  src: string;
  /** Obligatorio para video (frame de portada); ignorado en imágenes. */
  poster?: string;
  /** "portrait" para grabaciones móviles (9:16). Default: "landscape". */
  orientation?: "portrait" | "landscape";
  /**
   * Proporción real del asset como valor CSS de aspect-ratio (ej. "1910 / 943"
   * para capturas de browser full-screen). El escenario landscape del carrusel
   * la adopta y la media se ve completa, sin recortes laterales. Default 16:9.
   * Cargar la MISMA proporción en toda la media landscape de un proyecto (el
   * escenario es uno solo — usa la del primer ítem).
   */
  aspect?: string;
};

export type Project = {
  id: string;
  title: string;
  role: ProjectRole;
  status: ProjectStatus;
  /** Destacado: va primero en la grilla, más grande, y con el sello "cliente". */
  featured: boolean;
  summary: string;
  /**
   * Tags atómicos (un nombre de tecnología por entrada). Se muestran como
   * línea de texto en el cajetín de la ficha Y son la fuente de las skills
   * "probadas" del árbol (ver `resolveStack`/`PROVEN_NODE_IDS` en
   * `../skillTree.ts`) — cada string debe matchear el label o un alias de
   * un nodo del árbol (en dev avisa por consola si no).
   */
  stack: string[];
  links: {
    demo?: string;
    repo?: string;
  };
  /**
   * Media de la ficha (0..n): capturas y/o videos cortos (grabaciones de
   * pantalla navegando el sitio). Con 2+ ítems hay carrusel; con 1, ítem
   * fijo; vacío, la ficha se ve bien sin media. Capturas ideal 1440×810;
   * videos con la misma receta de encode que el brazo del Hero (mudos,
   * h264, ~1-2MB) + poster.
   */
  media: ProjectMedia[];
};
