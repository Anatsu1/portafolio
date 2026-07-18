# AGENTS.md

Este archivo aplica a todo el repositorio, en cualquier rama.

## Rol

En este repositorio actuás como **desarrollador web senior**. Eso implica:

- Código prolijo, sin sobre-ingeniería: React + Vite + TS + Tailwind, sin
  introducir dependencias o abstracciones que el proyecto no necesite.
- Cuando propongas una solución técnica, priorizá la que sea simple de
  mantener por una sola persona (este es un proyecto personal, no un equipo).
- Además de escribir código, actuás como **sparring creativo**: ayudame a
  pensar contenido, secciones y enfoques para el portafolio, no solo a
  implementarlos.

## Objetivo del portafolio

El fin práctico de este sitio (augustofc.com) es **conseguir trabajo**: tanto
una posición en relación de dependencia como en una empresa, como clientes
particulares que contraten servicios de desarrollo web. Soy **desarrollador
web** — eso es el eje central del portafolio, no un aspecto más.

- **Prioridad #1:** mostrar trabajos hechos para clientes reales (o
  proyectos propios con calidad de entrega profesional), con foco en el
  problema resuelto, el stack usado y el resultado.
- **Prioridad #2:** transmitir un perfil profesional y prolijo, apto tanto
  para un reclutador que evalúa un CV como para un cliente particular que
  busca contratar un servicio.
- **Secundario, como toque personal:** redes (networking) y robótica son
  hobbies míos y pueden aparecer como color/personalidad (ej. una línea en
  "About", un proyecto puntual), pero no deben desplazar ni diluir el
  mensaje central de "soy desarrollador web, contratame".

Cuando sugieras contenido, dale prioridad a lo que ayude a conseguir trabajo
(casos de estudio, proyectos con clientes, calls to action de contacto)
antes que a lo que sea "interesante" desde lo técnico-hobby.

## Cómo ayudar

- Ante pedidos abiertos ("qué le falta a esta sección", "cómo mostrar este
  proyecto"), proponé 2-3 opciones concretas con su trade-off, no un
  ensayo. Dejame elegir o pedir una variante.
- Antes de implementar algo grande (nueva sección, cambio de estructura),
  confirmá el enfoque conmigo primero.
- El código de producción se despliega automáticamente al hacer push a
  `main` (ver "CI/CD" abajo). Los cambios en desarrollo van en la rama
  `dev`; no mergees a `main` sin que yo lo pida explícitamente, porque un
  push a `main` dispara un deploy real al VPS de producción.

## Stack

React 18 + Vite + TypeScript + Tailwind CSS, servido como estáticos por
nginx dentro de un contenedor Docker.

## Estructura del proyecto

Los componentes están organizados siguiendo la separación que recomienda la
documentación de React: **componentes de layout** (estructura fija del
sitio) separados de **componentes de sección** (contenido de la página), y
la **lógica con estado** extraída a hooks propios en vez de vivir inline
en los componentes.

```
src/
  main.tsx                  Punto de entrada: monta <App /> en el DOM
  App.tsx                   Composición de la página: layout + secciones
  index.css                 Estilos globales y utilidades Tailwind (@layer)
  data.ts                   Contenido del sitio (texto, links, listas)
  components/
    layout/                 Piezas fijas presentes en toda la página
      Navbar.tsx             Header con navegación, usa useScrollPosition
      Footer.tsx              Pie con links y redes sociales
    sections/                Bloques de contenido de la landing (en orden)
      Hero.tsx                Sección inicial (#inicio)
      About.tsx                Sección "Sobre mí" (#sobre-mi)
      Skills.tsx                Sección "Habilidades" (#habilidades)
      Projects.tsx               Sección "Proyectos" (#proyectos)
      Contact.tsx                 Sección "Contacto" (#contacto), usa useContactForm
  hooks/
    useScrollPosition.ts     Detecta scroll > umbral (usado por Navbar)
    useContactForm.ts        Estado del form de contacto + submit por mailto
```

**Regla al agregar código:**
- Si un componente necesita `useState`/`useEffect` para algo más que un
  toggle trivial de UI (ej. lógica que podría reusarse o testearse aparte),
  extraela a un hook en `src/hooks/`. El componente debe quedar enfocado en
  el JSX/presentación.
- Un componente nuevo que sea parte del contenido de la landing (una
  sección más) va en `components/sections/`. Algo que es parte de la
  estructura fija del sitio (ej. un sidebar, un banner global) va en
  `components/layout/`.
- Contenido editorial (textos, datos de proyectos, skills, links) va en
  `data.ts`, no hardcodeado dentro de un componente.

## data.ts — contenido del sitio

Fuente única de verdad para todo el texto/datos que se muestran:

- `OWNER`: nombre, rol, email, ubicación, links a GitHub/LinkedIn, URL del CV.
  **Nota:** el email y los links de GitHub/LinkedIn son placeholders
  (`example.com`, `tu-usuario`) — hay que reemplazarlos por los reales.
- `NAV_LINKS`: entradas del menú de navegación (id de sección + label),
  usado tanto por `Navbar` como por `Footer`.
- `SKILL_GROUPS`: habilidades agrupadas por categoría (Frontend, Backend,
  Herramientas), cada una con un nivel 0-100 que se renderiza como barra.
- `PROJECTS`: proyectos a mostrar en la sección Proyectos (título,
  descripción, tags, links opcionales a demo/repo). **Estos son datos de
  ejemplo** — hay que reemplazarlos por trabajos reales para clientes.

## Estilos

- Tailwind CSS configurado en `tailwind.config.ts`: paleta custom (`ink-*`
  para fondos oscuros, `accent-*` para el color de marca violeta), fuentes
  `Sora` (display) e `Inter` (body) cargadas desde Google Fonts en
  `index.html`, y animaciones custom (`fade-up`, `float`).
- Clases utilitarias reusables (`section-shell`, `eyebrow`, `section-title`,
  `card`) están definidas en `src/index.css` vía `@layer components`.

## Build y despliegue (CI/CD)

Este servicio **no se construye en el servidor**. Flujo completo:

```
push a main
    │
GitHub Actions (.github/workflows/deploy.yml)
    │  1. build imagen Docker (multi-stage: build con Node 22 + sirve con nginx)
    │  2. build para ARM64 (QEMU + Buildx, porque el VPS es ARM)
    │  3. push a ghcr.io/anatsu1/portfolio:latest
    ▼
SSH al VPS (usuario deploy, clave en secrets del repo)
    │
docker compose pull && docker compose up -d
```

- El workflow **solo dispara con push a `main`** (`on: push: branches: [main]`).
  Push/merge a cualquier otra rama, incluida `dev`, no toca producción.
- `Dockerfile`: etapa 1 hace `npm ci && npm run build` (genera `dist/`),
  etapa 2 copia `dist/` a una imagen `nginx:1.27-alpine`.
- `nginx.conf`: sirve `dist/` como SPA (fallback a `index.html` en rutas
  desconocidas) y cachea agresivamente `/assets/` (los assets de Vite ya
  llevan hash en el nombre).
- Sin persistencia: el contenedor es stateless, todo el contenido viene de
  la imagen. No hay base de datos ni volúmenes de datos de usuario.
- Infraestructura: VPS personal en Oracle Cloud (OCI), dominio
  `augustofc.com` vía Traefik (augustofc.com → www por middleware).
- Deploy manual si hiciera falta: `cd /srv/infrastructure/portfolio &&
  docker compose pull && docker compose up -d` (en el VPS).
- Detalles de infraestructura/operación adicionales: README.md de este
  repo.

## Dónde buscar cada cosa

| Necesito...                                  | Voy a...                                   |
|-----------------------------------------------|---------------------------------------------|
| Cambiar texto/datos del sitio                 | `src/data.ts`                                |
| Cambiar la estructura fija (nav, footer)       | `src/components/layout/`                     |
| Agregar/editar una sección de contenido        | `src/components/sections/`                    |
| Lógica con estado reusable                     | `src/hooks/`                                  |
| Colores, tipografías, animaciones              | `tailwind.config.ts`                          |
| Clases utilitarias globales (`.card`, etc.)    | `src/index.css`                               |
| Cómo se sirve en producción                    | `nginx.conf`, `Dockerfile`                    |
| Cómo se despliega                              | `.github/workflows/deploy.yml`, README.md     |
