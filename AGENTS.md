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
      ScrollProgress.tsx       Línea de progreso de scroll fija al borde derecho (useScroll de Motion)
    sections/                Bloques de contenido de la landing (en orden)
      Hero.tsx                 Sección inicial (#inicio): nombre + video del brazo
      hero/
        HeroArmVideo.tsx         Video del brazo (claro/oscuro según tema, presentacional)
      About.tsx                 Sección "Sobre mí" (#sobre-mi)
      Projects.tsx              Sección "Proyectos" (#proyectos): fichas + árbol de skills (filtro)
      projects/
        ProjectPlate.tsx          Ficha técnica (blueprint) de un proyecto — cajetín + capturas + links
        ProjectCarousel.tsx       Carrusel de media (capturas + videos) de la ficha (tira "FIG.")
        SkillTree.tsx             Red de nodos de skills (tiers + SVG de aristas + línea de resultado)
        SkillNodeButton.tsx       Nodo del árbol (probado/sin probar/locked + elegido/prerequisito/apagado)
      Contact.tsx               Sección "Contacto" (#contacto), dos audiencias (Empresas primero y por defecto)
  data/
    projects/
      types.ts                 Tipo Project compartido (id, role, status, featured, stack, links, media[])
      prestarte.ts              Un archivo por proyecto real
      index.ts                  Agrega PROJECTS (las skills probadas se derivan en skillTree.ts)
    skillTree.ts               Nodos del árbol de skills (requires/tier/aliases) + derivados (aristas, ANCESTORS, resolveStack, PROVEN_NODE_IDS)
  hooks/
    useTheme.tsx             Modo claro/oscuro: contexto (ThemeProvider) + persistencia
    useScrollPosition.ts     Detecta scroll > umbral (usado por Navbar)
    useContactForm.ts        Estado del form de contacto + submit por mailto
    useCarousel.ts           Estado de carrusel genérico (About + capturas de proyectos)
    useSkillTree.ts          Selección del árbol: `picked` (filtra) vs `selected` (= picked + prerequisitos, sólo visual)
    useMeasuredEdges.ts      Mide centros reales de los nodos para las aristas SVG (ResizeObserver)
    useProjectSlider.ts      Slider de fichas: next/prev/goTo animados, índice desde el scroll real, focus del filtro
    useHeroReveal.ts         Reveal GSAP del texto del Hero + impacto (halo y nombre quedan prendidos, botones parpadean)
    usePageLoaderExit.ts     Animación de "puertas de vault" al cerrar el PageLoader
    useArmFollowCam.ts       Cámara (zoom + pan del video) que sigue la pinza (solo mobile)
  assets/                    Videos del brazo (arm-{light,dark}.mp4) + posters
    prestarte/               Capturas de cada proyecto — una carpeta por proyecto
    utn-necochea/            (assets/<id-del-proyecto>/, 2-3 capturas que rotan
                             en el carrusel, nombradas <id>-01.jpg, -02…)
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
- `NAV_LINKS`: igual que antes (una entrada, `#proyectos`, cubre proyectos y
  skills — ver "Proyectos y skills unificados" abajo).

## Proyectos y skills unificados (ficha técnica + árbol de skills)

`Skills.tsx` ya no existe: proyectos y habilidades son **una sola sección**
(`Projects.tsx`, `#proyectos`). La idea de fondo: las skills se demuestran
con proyectos reales, no con barras de porcentaje inventadas.

- **Modelo de datos** (`src/data/projects/`): un archivo por proyecto
  (`prestarte.ts`, `utn-necochea.ts`, etc.) que exporta un objeto `Project`
  (tipo en `types.ts`: `id`, `title`, `role` ("cliente" | "personal" |
  "academico" — trabajos de la carrera/tesis), `status` ("activo" |
  "en-progreso" | "preview" — terminado pero con la demo estática hasta
  volver a levantar el backend), `featured`, `summary`, `stack` (tags
  atómicos), `links.{demo,repo}`, `media` (array, puede ser vacío)).
  Los roles "cliente" y "academico" muestran un **sello girado** en la
  esquina de la ficha ("CLIENTE" / "TESIS", `STAMP_LABEL` en
  `ProjectPlate.tsx`); "personal" no lleva sello.
  **Temporal:** `ejemplo-homelab.ts` y `ejemplo-api.ts` son placeholders
  para probar el slider/filtro (capturas grises generadas en
  `assets/ejemplo-*/`) — sus stacks marcan nodos del árbol como
  "probados" sin proyecto real detrás; reemplazarlos con datos reales o
  sacarlos antes de deployar.
  Para sumar un proyecto nuevo: crear su archivo + agregar una línea al
  array en `index.ts`. Cada string de `stack` debe matchear el label o un
  alias de un nodo del árbol de skills (en dev, `resolveStack` avisa por
  consola si no).
- **Media** (`ProjectCarousel.tsx`): cada ficha muestra su `media`
  (capturas y/o **videos cortos** de 10-15s navegando el sitio) en un
  carrusel con crossfade (reusa `useCarousel`), auto-avance de 6s y una
  tira de controles "FIG. 01 / 03" **debajo** (no flechas superpuestas —
  taparían UI real). Con 1 ítem no hay controles; con 0 no renderiza nada.
  Fit: `object-cover object-top` (el recorte residual come el borde
  inferior, nunca el header del sitio capturado). Videos con la misma
  receta de encode que el brazo (`-an`, h264, ~1-2MB) + `poster`
  obligatorio.
  - **Proporción real con `aspect`**: cada ítem puede declarar su
    aspect-ratio CSS (ej. `"1910 / 943"` para capturas de browser
    full-screen, más anchas que 16:9) y el escenario landscape lo adopta —
    la captura se ve completa, sin recorte lateral. Sin `aspect`, 16:9.
    Toda la media landscape de un proyecto debe compartir proporción (el
    escenario es uno solo: usa la del primer ítem). Las capturas se
    re-escalan a 1440 de ancho (JPEG q88) conservando su proporción y van
    en `assets/<id-del-proyecto>/`.
  - **Videos**: mudos, loop, `preload="metadata"`. Solo el slide activo
    reproduce (el resto se pausa — batería/datos) y el auto-avance se
    suspende mientras un video está activo (no se corta a los 6s; se
    avanza a mano). Con `prefers-reduced-motion` no hay autoplay: el video
    muestra controles nativos.
  - **Orientación por ítem** (`orientation: "portrait"` para grabaciones
    móviles 9:16, dato explícito — cero layout shift): si toda la media es
    portrait el escenario es vertical con alto fijo; mezclada, el ítem
    portrait se centra dentro del escenario 16:9. Preferir una sola
    orientación por proyecto.
  - **Full-bleed en mobile**: el marco rompe el padding de la ficha
    (`-mx-6`, sin bordes laterales) — la media va borde a borde; en `md:`
    vuelve al marco con borde redondeado.
- **Fichas = slider horizontal en todas las resoluciones** (`Projects.tsx`):
  scroll-snap nativo (`snap-start`) — en mobile cada ficha es un slide al
  88% del ancho (asoma la siguiente); en `lg:` entran 2 por vista
  (`min-w-[calc(50%-0.75rem)]`). La sección mide siempre lo mismo aunque
  se carguen muchos proyectos (decisión explícita del usuario: nada de una
  ficha por fila / página infinita — `featured` ya NO ocupa 2 columnas,
  solo ordena primero). **Sin scrollbar** (oculta con `scrollbar-width` +
  `::-webkit-scrollbar`): se navega con una tira de controles debajo —
  mismo lenguaje visual que la tira "FIG." del carrusel (chevrons +
  contador "N.º 01 / 04" + ticks clickeables) — o con swipe/rueda nativos.
  Todo vive en `useProjectSlider`: next/prev/goTo con scrollTo smooth
  (directo bajo reduced-motion), índice actual derivado del scroll REAL
  (única fuente de verdad — nunca se desincroniza del swipe),
  `atStart`/`atEnd` para deshabilitar flechas (en desktop el scroll
  termina antes que la última ficha: no alcanza con el índice), y el
  focus del filtro (viaja a la primera ficha que matchea al seleccionar
  tecnología). Posiciones medidas del DOM real, no índice × ancho.
- **Fichas de composición FIJA** (`ProjectPlate.tsx`): cada zona tiene
  altura **fija con `h-*` + overflow-hidden — NO `min-h`** (min-h reserva
  un mínimo pero deja crecer: un stack o título que envolvía un renglón
  extra corría todo lo de abajo; lección de esta iteración). Así imagen,
  título y texto caen a la MISMA altura en todas las fichas y el slider
  no salta al navegar (pedido explícito del usuario). Zonas: cajetín
  `h-[4.25rem] content-start` (1 fila de metadatos + 2 renglones de
  stack; el STACK siempre en su propia línea, `basis-full`, y `pr-24` si
  hay sello); título `h-[2.8em] leading-[1.4]` (exactamente 2 renglones —
  `text-lg` en mobile para que títulos largos entren en 2); resumen
  `h-[4.875em]` + `line-clamp-3` (exactamente 3 renglones) con botón
  "Ver más / Ver menos" en un **slot fijo `h-5`** (aparece solo si el
  texto de verdad desborda — scrollHeight vs clientHeight +
  ResizeObserver — pero el slot ocupa su altura siempre); tira de links
  con `mt-auto` renderizada SIEMPRE (sin demo ni repo muestra "—", campo
  vacío de plano técnico). Única variación permitida: "Ver más" expandido
  (pasa a `min-h`, agranda solo esa ficha). Las tecnologías del STACK van
  en `brand-projects`. Restricciones de contenido para no desbordar las
  zonas fijas: stacks de hasta ~6 tecnologías, títulos de hasta 2
  renglones en mobile, y toda la media landscape con la misma proporción
  (~1910/943) y 2+ ítems (con 1 no hay tira FIG y esa ficha cierra
  distinto).
- **Árbol de skills** (`src/data/skillTree.ts` + `SkillTree.tsx` +
  `useSkillTree`): reemplaza a los chips por ficha y al viejo catálogo de
  "piezas sueltas". Nodos con `requires` (prerequisitos, lectura
  pedagógica: HTML5 → CSS3/JS → frameworks; rama infra aparte: linux →
  docker, git → github/cursor), `tier` (columna de layout) y `aliases`
  (matching contra `Project.stack`, ej. "Bootstrap 5" → nodo `bootstrap`).
- **`picked` vs `selected`: la distinción que hace congruente al filtro.**
  `useSkillTree` mantiene DOS conjuntos y hay que respetar cuál se usa para
  qué:
  - `picked` = lo clickeado a mano. Es lo **único que filtra**.
  - `selected` = `picked` + toda su cadena de prerequisitos (clausura sobre
    `requires`, vía `ANCESTORS`). Es **puramente visual**: enciende el camino
    en la red, que es la lectura pedagógica ("para React necesitás HTML5 y
    JavaScript").

  **El bug que esto arregla** (no volver a mezclarlos): antes se filtraba por
  `selected`, así que un clic en Tailwind encendía `css3`+`html5` y el filtro
  pasaba a ser "tailwind O css3 O html5" — como casi todo proyecto tiene
  HTML/CSS, matcheaban todos y el filtro no decía nada. Por eso también se
  borró `DESCENDANTS` de `skillTree.ts`: quedó huérfano y era justo la pieza
  que invitaba a re-cablear la cascada al filtro.
- **El filtro es RESTRICTIVO (AND)**: la ficha matchea si su stack contiene
  **todas** las tecnologías de `picked`. Sumar tecnologías **achica** el
  resultado, nunca lo agranda. Las que no matchean se atenúan
  (`opacity-40 saturate-50`) y las que sí se resaltan
  (`border-brand-skills/40`) — **nunca se desmontan** (slider estable).
  Con 0 matches el mensaje se bifurca: con una sola tecnología elegida
  adelanta el futuro proyecto del homelab; con varias, sugiere sacar alguna
  (que es lo que suele pasar con AND y pocos proyectos cargados).
- **Toggle**: un clic agrega/saca de `picked`, nada más. Clickear un nodo que
  estaba encendido sólo como prerequisito lo **asciende** a elegido (pasa a
  filtrar); sacar un elegido apaga su cadena salvo lo que siga sosteniendo
  otro elegido. La clausura se recalcula sola (`useMemo`) — no hay estado
  paralelo que sincronizar ni cascada que mantener a mano.
- **Estados visuales del nodo** — son cuatro ejes y conviene no colapsarlos:
  borde sólido = probado por un proyecto (`PROVEN_NODE_IDS`, derivado —
  nunca a mano), punteado = sin proyecto todavía, candado = prerequisitos
  apagados (visual nomás, sigue clickeable), y **tres niveles de encendido**:
  elegido (relleno fuerte + `ring`, está filtrando), prerequisito (encendido
  tenue, no filtra) y apagado. Ese nivel intermedio no es decorativo: sin él,
  ver CSS3 encendido tras elegir Tailwind hace esperar que CSS3 filtre.
- **Look de grafo, no de tabla**: cada nodo es un **círculo con el label
  debajo** (como una visualización de red/grafos), las aristas son
  **curvas cuadráticas** (control point perpendicular al segmento, signo
  alternado por índice — determinístico) y en desktop las columnas de fase
  van centradas verticalmente con un stagger horizontal alternado
  (`±translate-x`) para romper la grilla. En mobile las fases rotan a
  **filas apiladas** (arriba → abajo), cada una centrada y sin wrap —
  aristas cortas mayormente verticales (la versión con `flex-wrap`
  quedaba caótica en el teléfono y se descartó).
- **Las aristas se miden del DOM real** (`useMeasuredEdges`): el SVG de
  fondo conecta **centros medidos** con `getBoundingClientRect` (que
  incluye los transforms del stagger) + ResizeObserver — correcto en todo
  breakpoint por construcción, sin coordenadas a ojo (misma lección del
  marcador descartado del Hero). El ref medido es el **círculo** del nodo
  (no el botón entero, que incluye el label); el círculo tiene fondo
  opaco a propósito: enmascara los extremos de las curvas, que llegan a
  su centro sin lógica de anclaje por lado.
- La ficha conserva una **línea de texto plano** con el stack en el cajetín
  (`STACK HTML5 · CSS3 · …`) — una ficha screenshoteada/impresa se
  entiende sola, sin consultar el árbol.
- **Se sacó el buscador/filtro por tag** que tenía la vieja `Projects.tsx`
  (`useProjectFilter.ts`, borrado): el árbol de skills ES el filtro ahora.

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
  | `brand-projects` | Cromado de la ficha de proyecto (eyebrow, sello, link demo) | rojo `#dc2626` | naranja `#f97316` |
  | `brand-skills` | Anotaciones de stack en la ficha + catálogo de piezas sueltas | amarillo `#eab308` | violeta `#8b5cf6` |

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

**Posición del bloque de texto vs. el cuadrado del video:** el contenedor
del texto **no** usa el patrón habitual `mx-auto max-w-6xl` (el mismo que
usa `Navbar`) — ese contenedor se centra a partir de los 1152px de ancho,
así que su margen crece cada vez más cuanto más grande la pantalla. El
video, en cambio, es full-bleed (100vw × 100vh, `object-cover`) y el
cuadrado que dibuja el brazo queda anclado a una proporción casi fija del
ancho/alto reales (`object-position: center` + un clip nativo 16:9). En
pantallas grandes (1920+) ambos sistemas divergían y el texto quedaba
desfasado del cuadrado — a resoluciones más chicas coincidía por
casualidad. Arreglo: el contenedor del texto usa `padding-left: 14vw` (en
vez de un ancho fijo centrado) y, a partir de `md:`, se posiciona con
`position: absolute; top: calc(50vh - 18vw)` en vez de centrarse por
flexbox (`items-center`, que centra según el **alto** del viewport, no
según el ancho — el cuadrado del video se mueve con el ancho). Los
coeficientes (14vw, 18vw) salen de medir la posición real del cuadrado
dentro de los videos nativos (`arm-light.mp4`/`arm-dark.mp4`, ambos 16:9) —
si se regenera el video con el cuadrado en otro lugar del frame, hay que
volver a medir y ajustar estos dos números.

**Breakpoint `md` redefinido (teléfono apaisado):** en
`tailwind.config.ts`, `md` es un screen "raw":
`(min-width: 768px) and (min-height: 500px)`. Un teléfono girado (~900×410)
supera los 768px de ancho pero no tiene alto para el layout desktop (el
Hero posicionado con vh quedaba pisado por el nav horizontal) — con la
condición de altura conserva el layout mobile (nav hamburguesa, Hero en
flujo, fichas en snap-carousel), que scrollea sin romperse. Consecuencia de
ser "raw": Tailwind no lo auto-ordena con los demás screens, así que **no
usar `md:` y `lg:` sobre la misma propiedad de un mismo elemento** (hoy no
ocurre en ningún componente). El follow-cam del video
(`HeroArmVideo.tsx`) sigue chequeando `(max-width: 767px)` a propósito:
esa decisión es por *ancho* (en apaisado la pantalla es ancha y el recorte
estático del brazo se entiende bien, no hace falta la cámara con zoom).

**El video del brazo (`HeroArmVideo`):**
- Assets en `src/assets/`: `arm-light.mp4` (azul/fondo claro) y
  `arm-dark.mp4` (verde/fondo oscuro), ambos 1080p, más
  `arm-{light,dark}-poster.jpg` (frame 0 de cada uno).
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
- **Aura / impacto**: segunda timeline, pausada, disparada por
  `triggerOverload()` — `Hero.tsx` la conecta al `onDrop` de `HeroArmVideo`.
  El momento en que el brazo suelta el círculo reparte energía por el bloque,
  y **cada pieza la recibe distinto** (eso es a propósito, no una
  inconsistencia):

  | Pieza | Qué hace | Por qué |
  |---|---|---|
  | Halo (`lightRef`) | aparece y **queda**, con pulso | tapa el cuadrado del video |
  | Nombre (3 líneas del `h1`) | chispazo → **queda prendido**, latido en fase con el halo | es el foco de la escena |
  | Volanta + bloque secundario | chispazo → se apagan | un párrafo entero brillando es ilegible |
  | Botones GitHub/LinkedIn | **parpadean** y quedan prendidos | la energía "baja" por la página |

  El `radial-gradient` del halo tiene **dos capas de color**: un núcleo del
  color de **fondo** (`--color-background`, blanco en claro / casi negro en
  oscuro) a opacidad ~1 — eso es lo que disipa por completo el
  cuadrado+círculo del video (se funde con el fondo real de la página, no
  solo lo tapa con un tono) — rodeado de un halo más suave en
  `--color-brand-primary` (la "energía"). El pulso infinito solo baja la
  opacidad hasta ~0.92, para que el núcleo nunca deje de tapar el video.
- **Nada de esto se apaga solo.** El nombre antes hacía `GLOW_FLASH → GLOW_OUT`
  y a los ~0.7s quedaba únicamente el halo, lo que se leía como que el efecto
  se cortaba de golpe. Ahora asienta en `GLOW_ON` y late entre `GLOW_ON` y
  `GLOW_PULSE` con el **mismo** `duration`/`ease` que el pulso del halo
  (2.2s `sine.inOut`), así respiran juntos y no cada uno por su lado. Las
  cuatro constantes de glow comparten la forma exacta
  `0 0 Npx rgb(var(--color-brand-primary) / A)` porque **GSAP interpola
  strings complejas número a número** — cambiarle la estructura a una rompe
  la transición.
- **Botones sociales: se encienden por CLASE, no por estilos inline de GSAP.**
  La timeline agrega `hero-socket-on` a los `<a>` de `socialsRef`; los
  keyframes (`hero-socket-flicker`, en `index.css`) hacen el parpadeo de tubo
  fluorescente arrancando y asientan en el brillo final. Dos detalles que hay
  que respetar si se toca:
  - El selector es `a.hero-socket-on` (especificidad 0,1,1) para ganarle a
    las utilities de Tailwind (0,1,0) **sin** tapar los `hover:` (0,2,0) — si
    esto se hiciera con `gsap.set`, el estilo inline mataría el hover.
  - La clase vive en `@layer components`, y Tailwind **purga también esa
    capa**: el string `hero-socket-on` tiene que seguir apareciendo literal
    en algún archivo de `content` (hoy, en `useHeroReveal.ts`).
- **Reset por cambio de tema**: un `useEffect` separado (dependencia
  `theme`, se salta la primera corrida) apaga **todo** lo que quedó
  encendido — halo, glow del nombre y clase de los botones — y resetea el
  flag de disparo. Como `HeroArmVideo` se remonta (`key={theme}`) y repite el
  video desde cero en cada toggle, queda "como al principio" hasta que ese
  video vuelve a soltar el círculo. Si no se apagaran, el parpadeo no se
  volvería a ver nunca y el nombre quedaría con el glow del tema anterior.
- Red de seguridad: si el autoplay se bloquea, `triggerOverload` igual
  dispara a los 7s (el reveal ya no depende de esto).
- `prefers-reduced-motion`: aplica el estado final del texto de una sola vez
  (sin glow), el halo nunca se anima (queda invisible) y los botones se
  quedan en su estado normal — sin video no hay historia de energía que
  contar.

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
| Agregar un proyecto nuevo                        | `src/data/projects/` (archivo nuevo + agregarlo a `index.ts`) + capturas en `src/assets/projects/` |
| Agregar una skill al árbol / cambiar prerequisitos | `src/data/skillTree.ts` (SKILL_NODES)          |
| Tocar la ficha de proyecto, el carrusel o el árbol | `src/components/sections/projects/`             |
| Tocar el video del brazo del Hero                | `src/components/sections/hero/HeroArmVideo.tsx`, assets en `src/assets/arm-*` |
| Tocar el reveal del texto del Hero o el aura      | `src/hooks/useHeroReveal.ts` |
| Tocar el splash de entrada (puertas de vault)     | `src/components/layout/PageLoader.tsx`, `src/hooks/usePageLoaderExit.ts` |
| Tocar la cámara que sigue la pinza en mobile      | `src/hooks/useArmFollowCam.ts` |
| Lógica con estado reusable                       | `src/hooks/`                                      |
| Colores de marca, modo claro/oscuro              | `src/index.css` (variables), `tailwind.config.ts` (tokens) |
| Clases utilitarias globales (`.card`, etc.)      | `src/index.css`                                    |
| Cómo se sirve en producción                      | `nginx.conf`, `Dockerfile`                          |
| Cómo se despliega                                | `.github/workflows/deploy.yml`, README.md            |
