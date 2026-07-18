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
una posición en relación de dependencia en una empresa, como clientes
particulares que contraten servicios de desarrollo web. Soy **desarrollador
web** — eso es el eje central del portafolio, no un aspecto más.

- **Prioridad #1:** mostrar trabajos hechos para clientes reales (o
  proyectos propios con calidad de entrega profesional), con foco en el
  problema resuelto, el stack usado y el resultado.
- **Prioridad #2:** transmitir un perfil profesional y prolijo, apto tanto
  para un reclutador que evalúa un CV como para un cliente particular que
  busca contratar un servicio.
- **Secundario, como toque personal:** redes (networking) y robótica son
  hobbies míos y pueden aparecer como color/personalidad, pero no deben
  desplazar ni diluir el mensaje central de "soy desarrollador web,
  contratame".

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

React 18 + Vite + TypeScript + Tailwind CSS v3 + GSAP (animación del Hero),
servido como estáticos por nginx dentro de un contenedor Docker.

## Estructura del proyecto

```
src/
  main.tsx                  Punto de entrada: monta <App /> en el DOM
  App.tsx                   Composición de la página: layout + secciones
  index.css                 Variables de tema, estilos globales, @layer components
  data.ts                   Contenido del sitio (texto, links, listas)
  components/
    layout/                 Piezas fijas presentes en toda la página
      Navbar.tsx              Header con navegación + toggle de tema
      Footer.tsx               Pie con links y redes sociales
    sections/                Bloques de contenido de la landing (en orden)
      Hero.tsx                 Sección inicial (#inicio): nombre + animación del brazo
      hero/
        RobotArmScene.tsx        SVG del brazo/cinta/figuras (presentacional puro)
      About.tsx                 Sección "Sobre mí" (#sobre-mi)
      Projects.tsx              Sección "Proyectos" (#proyectos), con buscador
      Skills.tsx                Sección "Habilidades" (#habilidades)
      Contact.tsx               Sección "Contacto" (#contacto), dos audiencias
  hooks/
    useTheme.ts              Modo claro/oscuro: toggle + persistencia en localStorage
    useScrollPosition.ts     Detecta scroll > umbral (usado por Navbar)
    useProjectFilter.ts      Filtro de proyectos por tecnología
    useContactForm.ts        Estado del form de contacto + submit por mailto
    useHeroAssembly.ts       Timeline GSAP completo de la animación del Hero
```

**Regla al agregar código:**
- Si un componente necesita `useState`/`useEffect` para algo más que un
  toggle trivial de UI, extraela a un hook en `src/hooks/`. El componente
  debe quedar enfocado en el JSX/presentación.
- Un componente nuevo que sea parte del contenido de la landing va en
  `components/sections/`. Algo que es parte de la estructura fija del sitio
  va en `components/layout/`. Piezas presentacionales usadas por una sola
  sección (como `RobotArmScene`) van en una subcarpeta con el nombre de esa
  sección (`sections/hero/`, `sections/skills/`, etc.).
- Contenido editorial (textos, datos de proyectos, skills, links) va en
  `data.ts`, no hardcodeado dentro de un componente.

## data.ts — contenido del sitio

- `OWNER`: nombre completo (sin tildes — ver nota de estilo abajo), rol,
  credencial, qué está estudiando, email, ubicación, links, URL del CV.
  **Nota:** email y links de GitHub/LinkedIn son placeholders — hay que
  reemplazarlos por los reales. `cvUrl` apunta a un PDF que todavía no
  existe (no hay carpeta `public/` en el repo); cuando el usuario tenga el
  archivo real, crear `public/` y ponerlo ahí, Vite lo copia solo a `dist/`.
- **Convención de nombres sin tilde**: `OWNER.name`/`shortName` usan
  "Cesar"/"Fernandez" sin tildes en todo el sitio (decisión de estilo
  explícita del usuario, no un error de tipeo) — no las agregues.
- `NAV_LINKS`, `SKILL_GROUPS`, `PROJECTS`: mismo patrón que antes.
  `PROJECTS` son datos de ejemplo, hay que reemplazarlos por trabajos reales.

## Sistema de theming (modo claro/oscuro)

Arquitectura: variables CSS + `darkMode: "class"` de Tailwind — **no** hay
clases `dark:` en ningún componente. Todo el flip de tema es una sola clase
`dark` en `<html>`, manejada por `useTheme` (`src/hooks/useTheme.ts`).

- **Default: modo claro siempre**, sin consultar `prefers-color-scheme` del
  sistema — decisión explícita del usuario. La elección manual del usuario
  se guarda en `localStorage` (`portfolio:theme`) y tiene prioridad.
- Toggle (ícono sol/luna) en `Navbar.tsx`.
- Tokens neutros (`tailwind.config.ts` → `theme.extend.colors`, variables en
  `src/index.css` dentro de `:root`/`.dark`): `background`, `surface`,
  `border`, `heading`, `body`, `muted`. Cada uno es
  `rgb(var(--color-x) / <alpha-value>)`, así que los modificadores de
  opacidad (`bg-surface/70`, `border-border/5`) siguen funcionando.
- **Colores de marca**, uno por "slot" semántico (no por sección fija — el
  nombre del token es el rol, no el color literal, porque el color
  *cambia* entre modo claro y oscuro):

  | Token | Slot | Claro | Oscuro |
  |---|---|---|---|
  | `brand-primary` | Hero, Navbar, Contacto, brazo robótico | azul `#2563eb` | verde `#22c55e` |
  | `brand-projects` | Sección Proyectos, cuadrado de la cinta | rojo `#dc2626` | naranja `#f97316` |
  | `brand-skills` | Sección Skills, triángulo de la cinta | amarillo `#eab308` | violeta `#8b5cf6` |

  Si el usuario pide cambiar "el color de X", primero identificá a qué
  **slot** semántico pertenece X (no asumas que el nombre del token
  describe el color actual — ya cambió de significado varias veces).
- `.eyebrow` y `.card` (en `index.css` `@layer components`) son neutros a
  propósito — cada sección/call site aplica su propio color de marca
  encima (`className="eyebrow text-brand-projects"`), porque distintas
  secciones usan distintos slots.

## Animación del Hero (brazo robótico)

`Hero.tsx` + `hero/RobotArmScene.tsx` (SVG presentacional) +
`hooks/useHeroAssembly.ts` (todo el timeline de GSAP). El nombre completo
se arma en 3 líneas apiladas (primer nombre / nombre del medio letra por
letra / apellidos), derivadas de `OWNER.name.split(" ")` — nunca
hardcodeadas. Un brazo robótico (SVG, un solo color de marca `brand-primary`
en toda la ilustración) agarra un círculo de una cinta transportadora, lo
lleva hasta la posición real de la última letra del nombre del medio, y ahí
brilla y se transforma en esa letra; el resto de las letras completan con
un efecto de incandescencia (`textShadow` animado), y después se revela en
orden: nombre → apellidos → el resto (eyebrow + tagline + botones + redes).

**Gotcha de GSAP + SVG anidado (ya resuelto, no lo reintroduzcas):**
cada articulación del brazo es un `<g>` anidado que debe rotar sobre su
propio origen local (0,0), heredado del `translate` del padre. **No uses
`transformOrigin: "0px 0px"`** para esto — en CSS, eso apunta a la esquina
superior-izquierda del *bounding box* del elemento, no a la coordenada
local (0,0) del SVG (que para una `<line>` que va de (0,0) hacia arriba
queda en el borde inferior-centro del bbox, no en el superior-izquierdo).
Usar ese valor hace que el pivote esté mal y el segmento se "despegue" de
su base al rotar ángulos grandes (funciona en reposo por coincidencia, se
rompe a mitad de animación). La forma correcta es `svgOrigin: "0 0"`, que
sí opera en el espacio de coordenadas local del propio SVG sin la
ambigüedad del bbox ni el escalado del `viewBox`. Los `<g>` de las
articulaciones **no llevan rotación estática en el JSX**: la rotación de
reposo se setea vía GSAP (`gsap.set(ref, { svgOrigin: "0 0", rotation: ... })`)
como primer paso del hook, antes de armar el timeline.

**Comportamiento mobile vs. desktop (`isMobile` en `useHeroAssembly`):**
- Desktop: el brazo queda visible siempre (columna derecha del grid),
  incluso después de terminar su animación (pose de reposo con `animate-float`).
- Mobile: el brazo es protagonista solo al principio (el resto del texto ya
  arranca en `opacity-0`, así que naturalmente lo único visible al cargar
  es el brazo). Cuando termina de armar la letra, se desvanece y se le
  agrega la clase `hidden` (vía estado de React `armCollapsed` en
  `Hero.tsx`, disparado por el callback `onMobileArmHidden`) para que deje
  de ocupar espacio en el flujo — recién ahí se revela el resto del nombre.
  Si cambiás el timing de esta secuencia, el fade-out del brazo tiene que
  terminar *antes* de que empiece a revelarse `firstNameRef`.
- Respeta `prefers-reduced-motion`: si está activo, se salta todo el
  timeline y se aplica el estado final de una sola vez (sin la secuencia
  de dos actos en mobile — ahí simplemente se muestra todo junto, estático).

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
- Infraestructura: VPS personal en Oracle Cloud (OCI), dominio
  `augustofc.com` vía Traefik.
- Sin persistencia: el contenedor es stateless, todo el contenido viene de
  la imagen.
- Detalles de infraestructura/operación adicionales: README.md de este
  repo.

## Dónde buscar cada cosa

| Necesito...                                    | Voy a...                                       |
|-------------------------------------------------|-------------------------------------------------|
| Cambiar texto/datos del sitio                   | `src/data.ts`                                    |
| Cambiar la estructura fija (nav, footer, tema)  | `src/components/layout/`, `src/hooks/useTheme.ts`|
| Agregar/editar una sección de contenido          | `src/components/sections/`                        |
| Tocar la animación del brazo del Hero            | `src/components/sections/hero/RobotArmScene.tsx` (SVG), `src/hooks/useHeroAssembly.ts` (timeline) |
| Lógica con estado reusable                       | `src/hooks/`                                      |
| Colores de marca, modo claro/oscuro              | `src/index.css` (variables), `tailwind.config.ts` (tokens) |
| Clases utilitarias globales (`.card`, etc.)      | `src/index.css`                                    |
| Cómo se sirve en producción                      | `nginx.conf`, `Dockerfile`                          |
| Cómo se despliega                                | `.github/workflows/deploy.yml`, README.md            |
