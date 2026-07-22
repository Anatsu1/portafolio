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

### Dirección visual (nota para futuros cambios de estilo)

El portafolio tiene que sentirse como **abrir un vault o refugio**:
industria, tecnología, metal, pesado pero elegante — no un feeling
"corporativo genérico" ni "juguetón". Ejemplo ya aplicado: el `PageLoader`
(engranajes + puertas pesadas con remaches que se abren, ver "Animación del
Hero" más abajo). Tenerlo en cuenta al proponer loaders, transiciones,
texturas, tipografía o cualquier decisión de estilo nueva — es la dirección
por defecto, no hace falta que el usuario la repita cada vez.

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

React 18 + Vite + TypeScript + Tailwind CSS v3 + GSAP (reveal del texto del
Hero; el brazo es un video pre-renderizado), servido como estáticos por nginx
dentro de un contenedor Docker.

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
      PageLoader.tsx           Splash de entrada (tapa toda la página hasta que el Hero está listo)
    sections/                Bloques de contenido de la landing (en orden)
      Hero.tsx                 Sección inicial (#inicio): nombre + video del brazo
      hero/
        HeroArmVideo.tsx         Video del brazo (claro/oscuro según tema, presentacional)
      About.tsx                 Sección "Sobre mí" (#sobre-mi)
      Projects.tsx              Sección "Proyectos" (#proyectos), con buscador
      Skills.tsx                Sección "Habilidades" (#habilidades)
      Contact.tsx               Sección "Contacto" (#contacto), dos audiencias
  hooks/
    useTheme.tsx             Modo claro/oscuro: contexto (ThemeProvider) + persistencia
    useScrollPosition.ts     Detecta scroll > umbral (usado por Navbar)
    useProjectFilter.ts      Filtro de proyectos por tecnología
    useContactForm.ts        Estado del form de contacto + submit por mailto
    useHeroReveal.ts         Reveal GSAP del texto del Hero + aura (fade/slide en orden)
    usePageLoaderExit.ts     Animación de "puertas de vault" al cerrar el PageLoader
    useArmFollowCam.ts       Cámara (zoom + pan del video) que sigue la pinza (solo mobile)
  assets/                    Videos del brazo (arm-{light,dark}.mp4) + posters
```

**Regla al agregar código:**
- Si un componente necesita `useState`/`useEffect` para algo más que un
  toggle trivial de UI, extraela a un hook en `src/hooks/`. El componente
  debe quedar enfocado en el JSX/presentación.
- Un componente nuevo que sea parte del contenido de la landing va en
  `components/sections/`. Algo que es parte de la estructura fija del sitio
  va en `components/layout/`. Piezas presentacionales usadas por una sola
  sección (como `HeroArmVideo`) van en una subcarpeta con el nombre de esa
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
`dark` en `<html>`, manejada por `useTheme` (`src/hooks/useTheme.tsx`). Es un
**contexto** (`ThemeProvider` envuelve la app en `main.tsx`): fuente única de
verdad del tema, así cualquier componente comparte el mismo estado y reacciona
al toggle (p. ej. `HeroArmVideo` cambia el clip claro/oscuro).

- **Default: sigue el `prefers-color-scheme` del SO/navegador** la primera
  vez (sin nada guardado en `localStorage`). En cuanto el usuario usa el
  toggle, esa elección manual se guarda en `localStorage`
  (`portfolio:theme`) y tiene prioridad para siempre (no vuelve a mirar la
  preferencia del sistema).
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
  | `brand-primary` | Hero, Navbar, Contacto | azul `#2563eb` | verde `#22c55e` |
  | `brand-projects` | Sección Proyectos | rojo `#dc2626` | naranja `#f97316` |
  | `brand-skills` | Sección Skills | amarillo `#eab308` | violeta `#8b5cf6` |

  (El brazo/cinta ya no es un SVG themeable: es un video pre-renderizado con
  la paleta quemada — `arm-light` usa azul, `arm-dark` usa verde. Ver abajo.)

  Si el usuario pide cambiar "el color de X", primero identificá a qué
  **slot** semántico pertenece X (no asumas que el nombre del token
  describe el color actual — ya cambió de significado varias veces).
- `.eyebrow` y `.card` (en `index.css` `@layer components`) son neutros a
  propósito — cada sección/call site aplica su propio color de marca
  encima (`className="eyebrow text-brand-projects"`), porque distintas
  secciones usan distintos slots.

## Animación del Hero (brazo robótico)

`Hero.tsx` + `hero/HeroArmVideo.tsx` (video presentacional) +
`hooks/useHeroReveal.ts` (reveal GSAP del texto) + `layout/PageLoader.tsx`
(splash de entrada, page-level — ver "Cómo ayudar"/estructura). El brazo es
un **video pre-renderizado** (no un SVG animado a mano); el reveal del texto
es una timeline GSAP corta e independiente. El nombre completo se arma en 3
líneas apiladas (primer nombre / nombre del medio / apellidos), derivadas de
`OWNER.name.split(" ")` — nunca hardcodeadas. El `<h1>` lleva
`aria-label={OWNER.name}` y las 3 líneas van `aria-hidden` (evita doble
lectura; el texto real sigue en el DOM para SEO).

**Layout — overlay:** el video va **a pantalla completa** detrás del contenido
(`absolute inset-0`, `object-cover`), con un **scrim** (degradado del color de
fondo → transparente) que respalda el lado izquierdo para legibilidad. Por
encima de toda la página (Navbar incluido), `PageLoader` (en `App.tsx`) tapa
todo hasta que `Hero` avisa `onReady` — el video tuvo buffer suficiente y el
reveal del texto ya arrancó (`startReveal()`) — así nunca se ve ni el video
trabado ni el texto apareciendo sobre una escena incompleta. Se muestra
siempre (primera visita o no), aunque sea muy brevemente si todo está en
caché. Después, cuando el brazo "entrega" el círculo a la celda que brilla
(izquierda, ~x20%/y32% del frame — un cuadrado con un círculo adentro, en
azul/verde según tema), se activa un **aura** sincronizada detrás del texto
ya visible (ver abajo).

**El video del brazo (`HeroArmVideo`):**
- Assets en `src/assets/`: `arm-light.mp4` (azul/fondo claro, 1080p) y
  `arm-dark.mp4` (verde/fondo oscuro, 720p), más `arm-{light,dark}-poster.jpg`.
  Se importan en el componente (Vite los fingerprintea). Son el render **completo
  sin texto** (generado con Google Flow/Veo), sin audio, con denoise y optimizados
  (~1–1.5 MB). **mp4-only** (h264 anda en todos lados; vp9/webm no comprimía mejor
  este contenido).
- Elige la variante por tema con `useTheme()`. **Requiere el contexto de tema**
  (por eso `useTheme` es un `ThemeProvider`, no estado local): al togglear, el
  clip cambia y no desfasa con el fondo del sitio. El `key={theme}` en el
  `<video>` fuerza remontar → recarga el `<source>` y reproduce de nuevo (y
  vuelve a llamar `onReady`, aunque a esa altura `PageLoader` ya está
  apagado — no vuelve a taparse por un toggle de tema).
- **Sin `autoPlay`**: espera el evento `canplaythrough` (buffer suficiente
  para no trabarse) y ahí llama `.play()` a mano + dispara `onReady`. Mientras
  tanto se ve el `poster` (nunca un video a tirones) — esto es lo que evita el
  bug de la primera carga sin caché en dispositivos nuevos. Con
  `prefers-reduced-motion` (`<img>` de poster) dispara `onReady` en su propio
  `onLoad`.
- Corre **una vez** (`muted playsInline`, **sin `loop`**): el navegador
  retiene el último frame (pose de reposo).
- Dispara `onDrop` cuando el tiempo del video cruza `DROP_TIME` (~4.4s, el
  momento en que el brazo suelta el círculo) — eso activa el aura sobre
  el texto (ya visible desde el inicio), no el reveal.
- `prefers-reduced-motion`: renderiza solo el poster (`<img>`), sin video.

**El splash de entrada (`layout/PageLoader.tsx` + `hooks/usePageLoaderExit.ts`):**
- Vive en `App.tsx` (page-level, no dentro de `Hero`), `fixed inset-0
  z-[100]` — tapa **toda** la página, Navbar incluido. `App.tsx` guarda el
  estado `heroReady` y se lo pasa a `<Hero onReady={...}>`; `Hero` lo llama
  una vez, desde el mismo `handleVideoReady` que dispara `startReveal()`.
  Bloquea el scroll del body mientras está visible.
- Contenido: dos ícono `Cog` (lucide-react) girando en sentidos opuestos
  ("tuerquitas"), texto "Cargando…", un `Lock` central, y figuras geométricas
  de fondo (círculo, cuadrado, triángulo — mismo motivo que el video del
  brazo) a la deriva con `animate-float`. Todo en tokens **neutros**
  (`heading`/`muted`/`border`), nunca colores de marca — mismo look en
  claro/oscuro.
- **Salida estilo puerta de refugio/vault** (`usePageLoaderExit`, no un fade
  simple): cuando `visible` pasa a `false`, los engranajes se apagan, el
  `Lock` central pulsa como si se destrabara, y recién ahí dos hojas
  (`leftDoorRef`/`rightDoorRef`, cada una la mitad de la pantalla, con
  remaches en el borde interior) se separan hacia los costados
  (`xPercent: ±100`, `power3.inOut`) revelando la página. Es un tween de
  GSAP (JS), no CSS — la regla global de `prefers-reduced-motion` en
  `index.css` no lo neutraliza solo, así que `usePageLoaderExit` chequea
  `matchMedia` explícitamente y, si está activo, salta directo a oculto sin
  animar.
- **Se muestra siempre**, primera visita o no — no es solo un parche para
  conexiones lentas. Con todo cacheado dura apenas un instante; en la
  primera carga sin caché, lo que tarde el video en bufferear. `Hero.tsx`
  tiene una red de seguridad (`VIDEO_READY_SAFETY_MS`, 5s): si `onReady`
  nunca llega (conexión muy lenta, error), revela la página igual.

**El reveal del texto (`useHeroReveal`):**
- Timeline GSAP **pausada**, disparada por `startReveal()` — `Hero.tsx` la
  llama desde `handleVideoReady` (el mismo callback que dispara `onReady`
  hacia `PageLoader`), en simultáneo con el arranque real del video. Antes
  de reproducir espera `document.fonts.ready` (para que Sora ya esté
  aplicada y no shiftee el layout). Cada línea del nombre aparece con
  incandescencia (`textShadow` glow que se apaga) + fade/slide, en orden:
  eyebrow → nombre → medio → apellidos → resto (rol + botones + redes).
- **Aura**: segunda timeline, pausada, disparada por `triggerOverload()` —
  `Hero.tsx` la conecta al `onDrop` de `HeroArmVideo`. Anima un halo radial
  (`lightRef`, `blur-3xl`, expandido más allá del bloque de texto) detrás de
  todo el texto — `opacity 0→1` + `scale` leve — a la vez que las 5 piezas de
  texto (eyebrow, nombre, medio, apellidos, resto) brillan juntas con el
  mismo patrón `textShadow` que usa el reveal, pero simultáneo en vez de
  escalonado. El `radial-gradient` tiene **dos capas de color**: un núcleo
  del color de **fondo** (`--color-background`, blanco en claro / casi negro
  en oscuro) a opacidad ~1 — eso es lo que disipa por completo el
  cuadrado+círculo del video (se funde con el fondo real de la página, no
  solo lo tapa con un tono) — rodeado de un halo más suave en
  `--color-brand-primary` (la "energía"). El pulso infinito solo baja la
  opacidad hasta ~0.92, para que el núcleo nunca deje de tapar el video.
- **A diferencia de un destello puntual, el aura no se apaga sola**: al
  terminar la entrada, queda encendida con un pulso sutil e infinito
  (`opacity`/`scale` yoyo, `gsap.to(..., { repeat: -1, yoyo: true })`) —
  "emana energía" en vez de desvanecerse.
- **Reset por cambio de tema**: un `useEffect` separado (dependencia
  `theme`, se salta la primera corrida) apaga el aura de inmediato
  (fade-out corto) y resetea el flag de disparo cada vez que el tema
  cambia. Como `HeroArmVideo` se remonta (`key={theme}`) y repite el video
  desde cero en cada toggle, el aura queda invisible — "como al principio"
  — hasta que ese video repetido vuelve a soltar el círculo y la reactiva.
- Red de seguridad: si el autoplay se bloquea, `triggerOverload` igual
  dispara a los 7s (el reveal ya no depende de esto).
- `prefers-reduced-motion`: aplica el estado final del texto de una sola vez
  (sin glow) y el halo nunca se anima (queda invisible).

**La "cámara" que sigue la pinza en mobile (`hooks/useArmFollowCam.ts`):**
- Problema que resuelve: en mobile, `object-cover object-center` sobre un
  video 16:9 dentro de una sección `min-h-screen` recorta tanto los costados
  que solo se ve una tira central angosta — la pinza agarrando/soltando el
  círculo queda fuera de cuadro casi siempre, así que no se entiende qué
  hace el brazo.
- **Primer intento descartado**: un punto/overlay separado que seguía la
  posición de la pinza (`useArmMarker.ts`, ya no existe). Se veía como un
  puntito azul flotando cerca de los botones, sin conexión visual clara con
  el brazo (que apenas se asoma en el borde del video) — confuso, no
  contaba ninguna historia.
- **Solución actual**: en vez de un overlay inventado, animar el propio
  `<video>` — `objectPosition` (qué parte del frame queda centrada) +
  `scale` (zoom), como una cámara que hace foco y sigue la acción. Se ve el
  contenido *real* del video, más cerca y siguiendo el gesto, no un
  sustituto abstracto.
- `KEYFRAMES` en `useArmFollowCam.ts` son coordenadas (% del frame del
  video) + nivel de zoom en cada momento, tomadas a ojo de varios frames
  reales del clip (no tracking pixel a pixel — si se regenera el video, hay
  que volver a mirar frames y ajustar los números). Recorre: reach → agarra
  en la cinta → levanta → cruza → entrega (mismo instante que `DROP_TIME`,
  así el foco llega a la celda justo cuando se activa el aura) → vuelve al
  reposo (`scale: 1`, encuadre normal, igual que desktop). 1 segundo de
  timeline GSAP = 1 segundo real de video (`start()` se llama junto con
  `.play()` real, desde `handleCanPlayThrough` en `HeroArmVideo.tsx`).
- **Zoom sutil a propósito** (`scale` máx. ~1.2): la primera versión
  llegaba a 1.7 y el pan se sentía brusco/inestable durante toda la
  animación (feedback real del usuario) — con menos zoom el seguimiento se
  nota igual pero no "sacude" la escena.
- Solo corre en mobile: `enabled` viene de un `matchMedia("(max-width: 767px)")`
  medido una sola vez al montar (`isMobile` en `HeroArmVideo.tsx`) — a
  diferencia del resto del sitio, acá sí hace falta detección de mobile en
  JS porque se anima directamente el `<video>`, no algo que CSS pueda
  mostrar/ocultar solo.
- `prefers-reduced-motion`: no arma la timeline, el video queda con su
  `object-position`/`scale` normales (como desktop).
- **Se repite en cada cambio de tema** (`resetKey: theme`, pasado por
  `HeroArmVideo.tsx`): el `<video>` se remonta (`key={theme}`) y el timeline
  viejo queda apuntando a un nodo ya desmontado si no se reconstruye — el
  `useGSAP` de este hook toma `[enabled, resetKey]` como dependencias
  justamente para rearmarse contra el `<video>` nuevo y permitir que
  `start()` dispare de nuevo. Iba de la mano de otro bug real que se
  arregló junto con este: `firedDropRef` en `HeroArmVideo.tsx` (guarda si
  ya se disparó `onDrop`) no se reseteaba entre temas, así que el aura
  (`useHeroReveal`) tampoco se reactivaba después del primer toggle — ahora
  un `useEffect` con dependencia `theme` lo resetea en cada ciclo.

Para regenerar los videos: prompts de Flow/Veo y receta de encode (denoise
`hqdn3d`, `-an`, h264 `libopenh264`) en el plan de trabajo del feature. El render
debe venir **sin texto**, con el brazo a la derecha y la celda que brilla a la
izquierda (~x20%/y32%), misma animación en ambas paletas.

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
| Tocar el video del brazo del Hero                | `src/components/sections/hero/HeroArmVideo.tsx`, assets en `src/assets/arm-*` |
| Tocar el reveal del texto del Hero o el aura      | `src/hooks/useHeroReveal.ts` |
| Tocar el splash de entrada (puertas de vault)     | `src/components/layout/PageLoader.tsx`, `src/hooks/usePageLoaderExit.ts` |
| Tocar la cámara que sigue la pinza en mobile      | `src/hooks/useArmFollowCam.ts` |
| Lógica con estado reusable                       | `src/hooks/`                                      |
| Colores de marca, modo claro/oscuro              | `src/index.css` (variables), `tailwind.config.ts` (tokens) |
| Clases utilitarias globales (`.card`, etc.)      | `src/index.css`                                    |
| Cómo se sirve en producción                      | `nginx.conf`, `Dockerfile`                          |
| Cómo se despliega                                | `.github/workflows/deploy.yml`, README.md            |
