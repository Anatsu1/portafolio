# Hero móvil: la credencial del operario

En teléfonos (`max-width: 767px`) el Hero no muestra el brazo: **todo el
contenido va agrupado en una sola placa remachada** (credencial de operario).
Escritorio sigue igual (video del brazo + texto a la izquierda).

## Historia

1. **Video 16:9 recortado + cámara que seguía la pinza** (`useArmFollowCam`):
   se veía un pedazo de brazo detrás del texto y no se entendía nada.
2. **Escena SVG del brazo compuesta para vertical** (`HeroArmMobile`,
   2026-10-16, mañana): celda, base y cinta en la franja de abajo. Funcionaba,
   pero el dueño la descartó: la máquina competía con el texto, quedaba lejos
   del contenido (en 360×640 bajo el pliegue) y la información seguía
   desparramada en la pantalla en vez de agrupada. Se borró.
3. **Credencial** (esta versión).

## Referencias que se miraron y qué se tomó

| Referencia | Qué se tomó |
|---|---|
| [dataconale.com](https://dataconale.com/) (ya anotada como inspiración) | Bloque de identidad compacto: nombre + rol + 3 acciones juntos; una insignia de estado ("#OpenToWork") pegada al nombre → nuestro sello **DISPONIBLE**. |
| Plantillas de hero para desarrolladores de Framer y la [galería de Kombai](https://kombai.com/gallery/inspirations/hero-ios-7/) (heros móviles) | Perfil + contadores de logros + redes en **una tarjeta**; columna única, sin nada que compita al lado. |
| Placas de datos industriales ([guía de nameplates/data plates](https://www.expresscorp.com/the-complete-guide-to-nameplates-data-plates-rating-plates/)) | Lo que trae una placa real: marca, modelo, datos en tabla, aviso de seguridad → franja de peligro arriba, tabla de 3 datos, remaches en las esquinas. |
| Estilos "industrial" de [Kombai (foreman forge)](https://kombai.com/gallery/inspirations/foreman-forge/) y [superdesign](https://superdesign.dev/library/fountn-teal-frame-industrial-homepage) | Remaches como círculos reales, bordes a escuadra, textura con degradados CSS (sin imágenes). |
| Skill **ui-ux-pro-max** (patrones *hero-centric* y *bento*, guías UX) | Una sola CTA principal; info escaneable en celdas; objetivos táctiles ≥ 44 px con ≥ 8 px entre ellos; `svh`/`dvh` en vez de `vh`; estado final estático con movimiento reducido. (Su "design system" sugirió un patrón de FAQ y paleta propia: descartado, el sitio ya tiene tokens.) |
| Skill **web-design-guidelines** (Vercel) | Animar sólo `transform`/`opacity`; respetar `prefers-reduced-motion`; números tabulares en la tabla; foco visible; flecha con `env(safe-area-inset-bottom)` (hoy vale 0: `index.html` no tiene `viewport-fit=cover`, así que queda en 1rem). El nombre no usa `text-wrap: balance`: el corte en 2 renglones ya es explícito (`<br>`). |

## Conceptos

| | Concepto | A favor | En contra |
|---|---|---|---|
| **A** | **Credencial de operario** — placa de acero con franja de peligro soldada arriba, remaches, sello "DISPONIBLE", y adentro todo: nombre, rol, slogan, tabla de 3 datos, CTAs, redes y aviso del laboratorio. | Un solo bloque escaneable; la identidad industrial ES el contenedor, no un decorado aparte; entra arriba del pliegue. | Repite el lenguaje de la placa de características del final (se lee como "abre y cierra" con placas: aceptable). |
| B | Cajetín de plano técnico — el Hero como la ficha de un plano (rótulo, escala, revisión). | Coherente con las fichas de Proyectos. | Las fichas ya son eso: el Hero se confundiría con una ficha más; menos impacto. |
| C | Tablero de control — nombre en un display, métricas como medidores, botones como interruptores. | Muy vistoso. | Más pesado, se vuelve "juguetón" (contra la dirección visual) y los medidores se escanean peor que tres números. |

**Elegido: A.**

## Composición

```
┌──────────────────────────────┐
│ hola.mundo            ☀  ≡   │  nav
│                              │
│ ●▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚▚● │  franja de peligro soldada (cordón)
│ SOY             [● DISPONIBLE]│  sello = el momento DROP
│ Cesar Augusto                │
│ Fernandez Carbonell          │
│ Desarrollador Full Stack + IA│
│ SOLUCIONES A MEDIDA          │
│ ┌────────┬────────┬────────┐ │  tabla de datos de la placa
│ │08      │+7      │21      │ │
│ └────────┴────────┴────────┘ │
│ [ Contáctame ] [ CV ]        │
│ (gh) (in) [Probá el lab ↓]   │
│ ●                          ● │
└──────────────────────────────┘
            (↓)                   flecha "Sobre mí" (sin rótulo en pantallas bajas)
```

- La placa se centra en el alto que queda entre el nav y la flecha (`flex-1
  items-center`; `pb-16`, o `pb-20` desde 701px de alto donde la flecha lleva
  rótulo). Entra completa en 360×568. En 640–767px de ancho el nombre se
  limita a `text-4xl` en 2 renglones desde la placa (`[&_h1]`).
- Fondo: grilla de puntos tenue (plano técnico) con fundido radial; nada de
  video ni escena.

## Animación (GSAP, ~2,1 s, sólo `transform`/`opacity`)

| t | Qué pasa |
|---|---|
| 0,0 | La placa sube y aparece (el reveal del texto corre en paralelo, adentro). |
| 0,3 | La franja de peligro se despliega de izquierda a derecha. |
| 0,45–1,35 | Un punto incandescente suelda la franja a la placa (cordón al rojo que se enfría). |
| 1,45 | Los 4 remaches se clavan, uno tras otro. |
| **2,1** | **Sello DISPONIBLE** golpea la placa (pequeño "golpe" vertical) → `onDrop`: el nombre queda encendido, el halo y los botones sociales se prenden. Un destello cruza el acero. |

- **Cambio de tema**: no hay cartel a pantalla completa. En el lugar del sello
  aparece "Cargando el tema…" con el engranaje 0,9 s (el mismo lenguaje que
  `HeroThemeLoader` de escritorio), la placa se "re-suelda" y vuelve a sellar →
  `onDrop` otra vez.
- **Movimiento reducido**: placa terminada de entrada; `onDrop` al abrirse el
  vault.

## Contrato

`hero/HeroMobile.tsx`: `{ onDrop?, onReady?, play?, className?, children }`.
Envuelve al bloque de texto del Hero (el mismo DOM y los mismos refs del
reveal de GSAP), así que **no se remonta** al cambiar de tema: reinicia sólo su
propia animación. `onReady` al montar (no descarga nada). En teléfono no se
monta el video (no se baja el mp4).

## Resultado (2026-10-16)

- **Archivos**: `hero/HeroMobile.tsx` (nuevo, placa + `HeroMobileBackdrop`),
  `Hero.tsx` (bloque de texto único, rama teléfono/escritorio, sin scrim ni
  cartel a pantalla completa en teléfono), `hero/HeroStats.tsx` (tabla en
  teléfono), `data.ts` (`OWNER.availability`). Borrado `hero/HeroArmMobile.tsx`
  y las pistas `sample`/`Key` sin uso de `mobile/arm2d.ts`.
- **Peso** (build aislado con esos archivos en HEAD): principal 486,77 →
  492,40 kB (**+5,6 kB, +1,4 kB gzip**; escritorio también lo baja porque el
  import es estático — `lazy()` si se quiere evitar). Chunk de `MobileLab`
  vuelve a 23,12 kB. Sin `three` en el principal.
- **Red**: teléfono 0 pedidos de mp4 en producción.
- **Escritorio**: posiciones y tamaños de cada pieza del Hero idénticos al
  build anterior a 1440×900 y 1280×720.
- **Verificado** (Playwright headless): 360×568, 360×640, 390×844, 412×915 y
  700×900 en claro y oscuro; cuadros de la animación con
  `__heroPlateTl.pause().seek(s)`; cambio de tema después y a mitad de la
  entrada (una entrega por ciclo, botones que se reencienden, sin errores);
  toques reales sobre flecha, CTAs, redes, métricas y lab (objetivos de 46px);
  movimiento reducido.
- **Teléfono apaisado** (~844×390): sigue con el video, pero hereda las clases
  base nuevas (tabla con borde, redes y lab en una fila, márgenes más cortos).
  Se ve bien; si se quiere el layout viejo exacto, condicionar con `isPhone`.
- **Ajeno al Hero, encontrado al medir**: la página desborda en ancho en
  teléfonos (373px a 360) por la lista de `#trayectoria`
  (`ol.relative.mt-16`), y 2px a 700px por el contenedor de `Nameplate`. En
  un teléfono real eso hace que el navegador aleje el zoom de TODA la página.
  En las pruebas se neutralizó con `#trayectoria{overflow-x:clip}`.

## Rediseño 21-oct: "línea de ensamblaje"

La credencial remachada se reemplazó (`hero/HeroMobile.tsx`): panel de mando
(escuadras, cabecera mono, regla con marcas, reloj) armado por cuatro brazos de
plano técnico que traen piezas fantasma (PZ-01..04) y las encastran; el
encastre de la última dispara `onDrop` y enciende el contorno (destello +
pulso). Salió de comparar 4 variantes con agentes; elegida la que combina el
HUD con los brazos. Las zonas fantasma se ubican por posición de índice en el
bloque de texto de `Hero.tsx`: si cambia su estructura hay que actualizar el
mapeo. Dev: `window.__heroVBTl` pausa/posiciona la timeline.
