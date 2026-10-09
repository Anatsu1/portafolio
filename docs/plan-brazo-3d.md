# Plan: la celda del brazo 3D (portafolio interactivo)

Documento de trabajo. Es la fuente de verdad de QUÉ se construye, EN QUÉ
ORDEN y con qué decisiones ya tomadas. Cada fase termina con algo que se
puede ver y probar. Marcar `[x]` al terminar y anotar abajo lo que cambió
respecto de lo planeado.

Rama de trabajo: `dev`. **No se mergea a `main` sin pedido explícito**: un
push a `main` despliega a producción (ver AGENTS.md).

## Objetivo

Que el portafolio demuestre oficio de desarrollador web con una pieza
memorable: un brazo robótico industrial en 3D, dentro de una "celda" de
estética vault (acero oscuro, remaches, franjas amarillas), que levanta
cajas. Cada caja es una sección del portafolio. El visitante puede mirar
cómo el brazo lo hace solo (modo auto) o tomar el control (modo manual).
Al soltar una caja se abre un **panel lateral** con el contenido, al estilo
del sitio del cerebro de referencia.

Segunda capa, más adelante: un **Lab** donde se filtran proyectos por palabra
o dibujando un icono propio que reconoce una red neuronal chica (en el
navegador).

### Restricciones que mandan (AGENTS.md)

- El fin es conseguir trabajo: el 3D es **opcional y nunca bloquea** el
  camino a Proyectos y Contacto. Nav normal siempre visible y botón
  "Saltar al contenido".
- Sin sobre-ingeniería, mantenible por una sola persona.
- Lógica con estado en hooks (`src/hooks/`), componentes presentacionales.
- Contenido editorial en `src/data/`, no hardcodeado en componentes.
- Nombre sin tildes en `OWNER.name` (decisión de estilo).

## Corrección de rumbo (2026-10-08, tarde) — manda sobre lo anterior

- **El Hero se queda como estaba** (video del brazo + nombre). La celda 3D NO lo
  reemplaza: es la sección siguiente, el **Laboratorio** ("línea de ensamblaje"
  interactiva). Una complementa a la otra: presentación arriba, parte
  interactiva abajo. El Hero lo anuncia con un aviso ("Probá el laboratorio").
- El video del Hero **no arranca** mientras se cargan los modelos 3D: espera a
  que se abran las puertas del vault (`PageLoader`), que ahora muestra el
  avance real de la descarga (`useCellPreload`) y se abre cuando la escena ya
  dibujó su primer cuadro. En una PC lenta no se pierde la animación.
- Entornos: se sacó "Planta". Por defecto **Línea de montaje**; el segundo es
  un **Bosque genérico y lindo** (no pinos). Modelos gratis CC0 de Kenney
  (Factory Kit y Nature Kit) como material, créditos en `docs/creditos-3d.md`.
- La **base del brazo** (Meshy) quedó fea (chapa arrugada): se rehace como
  geometría procedural limpia (`RobotBase` + `RobotTurret`, esta última gira
  con el yaw).
- La caja **se abre** al quedar en la plataforma y se cierra antes de volver
  (tapa articulada, `CargoBoxModel`).
- Pendiente: **vista móvil** (hoy en teléfonos no se monta la celda y el Hero
  queda recortado). Ver propuesta en la bitácora.

## Estado al publicar en main (2026-10-08)

Publicado como **preview**: el laboratorio 3D y las secciones nuevas están en
`main`; lo pendiente se hace caso a caso.

Hecho:
- Hero intacto + aviso al laboratorio; el video del Hero espera a que se abran
  las puertas del vault (el loader muestra el avance real de los modelos).
- Laboratorio: brazo con IK, modo automático/manual, paneles laterales con el
  CV, caja que se abre en la plataforma, rótulos, dos entornos (línea de
  montaje por defecto y bosque), base y torreta procedurales, velocidad
  uniforme (×1,25).
- Secciones con animación de scroll: encabezados numerados con revelado por
  palabras (`SectionHeading`), banda en bucle (`MarqueeBand`), Trayectoria con
  columna que se dibuja con el scroll (`Trayectoria`), nav con "Trayectoria".
- Pruebas (Playwright headless, a mano; el repo no tiene suite): estrés del
  controlador, móvil/reduced-motion, tema, teclado, modelo roto, puerta del
  Hero, build de producción. Todo sin errores.

**Pendiente (anotado para retomar):**
1. **Vista móvil**: no se monta la celda y el Hero queda recortado. Propuesta:
   laboratorio 2D en SVG con la misma IK (estilo plano técnico) o carga opt-in
   del 3D (~9 MB). Esperando decisión del usuario.
2. **Rendimiento real**: no se pudo medir fps (solo render por software). La
   escena suma ~0,5–1 M triángulos y ~190 draw calls: validar en una GPU
   integrada y, si hace falta, bajar calidad (DPR, LOD de cajas, menos
   instancias del bosque).
3. Verificar en **Chrome real** (la extensión Chrome MCP no estuvo disponible).
4. Agarre: revisar a ojo con la GPU real que la garra abra al bajar y no
   atraviese la caja (corregido por cálculo, no visto en movimiento).
5. Pulido: la base se ve "nueva" junto a las piezas de Meshy (más desgaste /
   nervios); piezas de Kenney redondeadas (selladora grande, escáner de un solo
   poste); flores/rocas del bosque low-poly vs. árboles texturados; brazo
   inspector de la línea sin verificar sus ejes; primer tirón al abrir la
   primera tapa (recompilación de shaders por la luz interior).
6. Laboratorio: buscador por palabra y Lab de iconos con red neuronal (fases
   6–7, sin empezar). Arrastrar la pinza con el mouse (opcional).
7. Rediseño más a fondo de Proyectos/Contacto con ideas de dataconale.com
   (hoy solo se animaron encabezados; faltan contadores, flip de credencial,
   scroll horizontal, etc.).
8. Los modelos `.glb` no llevan hash en el nombre: si se regeneran, renombrar o
   limpiar caché (nginx los cachea 30 días).

## Etapa 2 (idea del dueño, 2026-10-09) — cajas de tecnología

El buscador por tecnología NO debe saltar directo al portafolio. Hoy, como paso
intermedio: buscar una tecnología hace que el brazo traiga la caja PROYECTOS y
su panel muestra solo los proyectos que la usan (sin tocar la página).

La idea final: al pasar por PROYECTOS el brazo **gira hacia la línea de
ensamblaje del fondo, agarra de ahí la caja de una tecnología** (React,
TypeScript, Python, Node.js, Docker, PostgreSQL, Java/Spring, Tailwind…; o por
familia: frontend/backend) **y al abrirla se muestran todos los proyectos que
la usan**, para denotar la experiencia en cada tecnología principal.
Preguntas de diseño abiertas:
- Alcance: el brazo llega a ~2,78 de radio y la línea está a z ≈ −4…−6. Hace
  falta una estación de recogida (alimentador corto) al alcance, detrás.
- Cajas de tecnología: chapa con el logo de marca (`data/brandIcons.ts`) o el
  nombre; ¿en la cinta (cajas distintas, no instanciadas) o en un estante?
- Cómo se elige: desde el buscador, chips de familias/tecnologías, o tocando la
  caja en la línea.
- Los iconos de sección (`data/cellIcons.ts`) van en el color del tema, sin
  color propio por sección (pedido del dueño).

## Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Enfoque | Brazo 3D real (opción A), con `three` + `@react-three/fiber` |
| Paneles | Panel lateral al soltar una caja (no scroll) |
| Cuerpo de la garra | Modelo de Meshy (`cuerpo.glb`), dedos espejados |
| Segmentos | Un solo `segmento.glb`, reusado con escala uniforme |
| Lab | Buscador por palabra + CNN propia entrenada por nosotros (fases 6-7) |
| Fallback | Video actual del brazo (mobile, sin WebGL, reduced-motion) |
| Hosting | Sigue siendo estático en nginx (VPS Oracle). Todo corre en el navegador |
| Rama | `dev` |

## Modelos (ya generados y optimizados)

Origen: Meshy (imagen → 3D, textura PBR), optimizados con `gltf-transform`
(simplify + resize 1024 + WebP + meshopt). Viven en `public/models/`.

| Archivo | KB | Triángulos | Tamaño (unidades) | Eje de bisagra |
|---|---|---|---|---|
| `base.glb` | ~640 | 25,6k | 1,90 × 1,50 × 1,90 | giro vertical (Y) |
| `segmento.glb` | ~440 | 9,9k | 1,90 × 0,39 × 0,27 (largo en X) | Z (discos miran a Z) |
| `cuerpo.glb` | ~450 | 22,4k | 1,70 × 1,90 × 1,12 | — (lleva las orejas de pivote) |
| `dedo.glb` | ~430 | 9,8k | 1,24 × 1,90 × 0,41 | Z (agujero de pivote arriba) |
| `caja.glb` | ~470 | 20,0k | 1,90 × 1,70 × 1,83 | — |

**Actualización (feedback del usuario):** la primera tanda estaba demasiado
reducida (~7 % de los triángulos, texturas de 1024) y se veía pobre de cerca.
Segunda tanda, en `public/models/`: texturas 2048 (caja 1536), meshopt nivel
alto. Base ~69k tris, segmento ~42k, cuerpo ~80k, dedo ~49k, caja ~26k.
Total ~8,8 MB y ~460k triángulos en escena (con 2 segmentos, 2 dedos y 5
cajas). Se muestra una barra de carga mientras bajan. Es lazy y solo desktop.

Todos los materiales son metal puro (`metallic = 1`): **sin mapa de entorno
se ven casi negros**. Hace falta `Environment` procedural (Lightformers, sin
descargar nada) + luces de contorno. Ver fase 1.

Si se regenera un modelo: Meshy → export `glb` con textura PBR → optimizar con
`npx @gltf-transform/cli` (ver "Cómo optimizar un modelo" abajo).

## Arquitectura propuesta

```
src/
  components/sections/
    Celda.tsx                  Sección (#celda): título, escena, controles, fallback
    celda/
      CellScene.tsx            <Canvas>, luces, entorno, cámara (lazy)
      RobotArm.tsx             Jerarquía de grupos: base → hombro → codo → muñeca → garra
      CargoBox.tsx             Una caja con su placa de texto (canvas texture)
      CellFloor.tsx            Piso, plataforma de ENTREGA, estantes
      SidePanel.tsx            Panel lateral (fase 4)
      CellControls.tsx         Botones Auto/Manual, Saltar contenido (fase 3-4)
      kinematics.ts            IK pura (fase 2)
      cellLayout.ts            Arco de cajas y plataforma de entrega
  data/
    cell.ts                    Cajas: id, label, sección destino, contenido del panel
  hooks/
    useCellSupport.ts          ¿Hay WebGL, mouse, reduced-motion? (decide 3D vs fallback)
    useCellController.ts       Línea de tiempo GSAP + IK por frame; estados auto/manual (fase 2-3)
public/models/                 *.glb
docs/plan-brazo-3d.md          Este archivo
```

Reglas: el 3D se carga con `React.lazy` + `Suspense` solo cuando la sección
entra al viewport. `three` no entra al bundle inicial.

### Cinemática (fase 2)

- Brazo planar de 2 segmentos + giro de base (yaw). Dado un objetivo (x, y, z):
  yaw = atan2(z, x); en el plano del brazo se resuelve IK analítica de 2
  eslabones (ley de cosenos). Sin librerías.
- Muñeca mantiene la garra vertical (compensa pitch del codo y hombro).
- Garra: apertura 0..1 → ángulo de cada dedo (espejados).
- Pivotes medidos del modelo (centros de los discos del segmento, agujero del
  dedo, orejas del cuerpo), guardados como constantes en `RobotArm.tsx`.

### Estados de la celda (fase 3)

`idle` → `auto` (cola circular de cajas) ↔ `manual` (click en caja).
Una tarea = ir sobre la caja → bajar → cerrar garra → subir → ir a ENTREGA →
soltar → abrir panel → esperar cierre → devolver la caja → siguiente.
Cualquier interacción del visitante pasa a `manual`; 8 s sin tocar vuelve a
`auto`.

## Fases

### Fase 0 — Preparación
- [x] Modelos generados y optimizados (5 piezas).
- [x] Rama `dev`.
- [x] Este plan.

### Fase 1 — Escena base (algo que se ve)
- [x] Dependencias: `three@0.170`, `@react-three/fiber@8`, `@react-three/drei@9`
  (v8/v9 por React 18), `@types/three`.
- [x] Modelos en `public/models/`.
- [x] `useCellSupport` (WebGL, reduced-motion, escritorio) y `useInViewport`.
- [x] `CellScene`: Canvas, entorno procedural (Lightformers), luces (rim verde
  en oscuro / azul en claro), plataforma y sombras de contacto. Se pausa
  (`frameloop="never"`) fuera de pantalla.
- [x] `RobotArm` ensamblado con `poseRef` mutable (yaw, hombro, codo, agarre);
  balanceo suave de prueba (`IdleArm`).
- [x] `CargoBox` x5 con placa rotulada (canvas texture) desde `data/cell.ts`.
- [x] `Celda.tsx` entre Hero y Sobre mí; en mobile/sin WebGL/reduced-motion
  no se monta (el sitio sigue igual).
- [x] Verificado con capturas headless en claro y oscuro; `npm run build` ok.
- Pendiente de pulir (fase 5): torreta del hombro (primitiva) se ve como un
  cilindro oscuro; las placas se leen chicas; rótulos con HTML al hover.
- Bundle: chunk principal 431 kB (sin cambios relevantes); `CellScene` 266 kB
  gzip en chunk lazy.

### Fase 2 — Cinemática y animación
- [x] IK analítica en `celda/kinematics.ts` (función pura: 2 segmentos + yaw,
  "codo arriba"). Se resuelve en polares (`phi`, `r`, `y`) alrededor de la base.
- [x] `hooks/useCellController.ts`: línea de tiempo GSAP que mueve el
  objetivo; la IK lo traduce a ángulos en cada `useFrame`; la caja agarrada
  sigue al objetivo.
- [x] Ciclo automático por caja: ir al lugar, bajar, cerrar garra, subir,
  girar a la plataforma ENTREGA, soltar, pausa (acá irá el panel) y
  traerla de vuelta. Se pausa fuera de pantalla.
- [x] `cellLayout.ts` (arco de cajas y plataforma) y `DeliveryPad.tsx`.
- Medida clave: `TOOL_DROP = 1,12` (muñeca a centro de las almohadillas).
- Verificado con una secuencia de capturas headless del ciclo completo.

### Fase 3 — Modo auto y manual
- [x] `useCellController` con cola de tareas ("mostrar caja N"): en automático
  encadena las cajas; en manual solo responde a pedidos y vuelve a una pose de
  espera. Si el visitante elige durante una tarea, esa se apura (`timeScale`).
- [x] Clic sobre una caja o botón de la fila inferior (alternativa accesible)
  pasa a manual y trae esa caja.
- [x] `CellControls`: selector Automático/Manual, botones por caja, "Saltar al
  contenido".
- [x] Aro de luz bajo la caja en hover y mientras se muestra; cursor pointer.
- [ ] Opcional: arrastrar la pinza con el mouse (se decide al ver el resto).
- Hoy en manual la caja espera 4 s en la plataforma; en la fase 4 espera hasta
  que se cierre el panel.

### Fase 4 — Paneles laterales (hecha)
- [x] `SidePanel` estilo HUD: kicker, título, cuenta regresiva (solo en
  automático; se frena con hover/foco), cierre con X y Esc, botón al pie que
  enlaza a la sección real. Entra/sale con `motion` (respeta reduced-motion).
- [x] Contenido desde `data/cell.ts` (sale del CV y de la marca personal; lo
  estudiado se declara "en curso"). Proyectos y Contacto se arman desde
  `PROJECTS` y `OWNER`, sin duplicar datos.
- [x] La escena se corre a la izquierda cuando el panel está abierto
  (`ViewShift`, `camera.setViewOffset`).
- [x] La caja se agranda y gira de frente a la cámara sobre la plataforma
  ("giro grande"), mientras el brazo se aparta.
- [x] Rótulos HTML sobre las cajas (drei `Html`), aro de luz al hover.
- [x] "Saltar al contenido" y botones de caja como alternativa de teclado.

### Controlador: máquina de estados (rehecho tras pruebas de estrés)
Cada tarea de caja = fases `ir` → `espera` → `volver`, cada una en su propio
tramo GSAP (antes era una sola línea de tiempo con pausas por posición, y con
cuadros lentos el cabezal se pasaba del punto de espera y el panel quedaba
trabado). En manual la espera dura hasta cerrar el panel; en automático corre
una cuenta de 8 s que se frena mientras se lee. Solo vale el último pedido del
visitante (no se acumula una cola) y se apura lo que queda de la tarea.
- Pruebas de estrés (headless con `?nolag`, solo desarrollo): ráfaga de clics,
  Esc repetido, cambios de modo/entorno/tema en movimiento, salir y volver a
  pantalla, hover que congela la cuenta, teclado, móvil y reduced-motion. Sin
  errores de consola.
- `window.__cellDebug()` (solo DEV) devuelve el estado interno del controlador.

### Fase 5 — Integración con el sitio
- [ ] Decidir si la celda reemplaza el video del Hero en desktop (con
  fallback a video en mobile). Si sí: rehacer el layout del Hero.
- [ ] Sincronizar con `PageLoader` (puertas de vault).
- [ ] Revisar mobile: fallback o versión simplificada (sin IK manual).
- [ ] Accesibilidad: `aria`, `prefers-reduced-motion`, foco.

### Fase 5b — Rediseño de las secciones (después del brazo)
- [ ] Revisar https://dataconale.com/ (referencia que eligió el usuario) para
  sacar ideas de cómo se muestra la información, el diseño y las
  animaciones de scroll, y aplicarlas a las secciones (Sobre mí, Proyectos,
  Contacto) para que acompañen al nuevo Hero.

### Fase 6 — Buscador por palabra (Lab nivel 1)
- [ ] Input con fuzzy match sobre nodos y alias de `skillTree.ts`.
- [ ] Reusa `useSkillTree.picked` para filtrar fichas.
- [ ] Resumen determinista ("Usé X en N proyectos: …"), sin LLM.

### Fase 7 — Lab de iconos con red neuronal (nivel 3)
- [ ] Definir set de 8-10 glifos (uno por familia/sección) + leyenda.
- [ ] Generar dataset (trazos sintéticos + los del usuario).
- [ ] Entrenar CNN chica (fuera del repo), exportar pesos JSON.
- [ ] Inferencia en navegador (TF.js u ONNX, o forward pass propio si es
  chica); carga lazy.
- [ ] Lienzo de dibujo, probabilidades por clase, navega o filtra.

### Fase 8 — Pulido y deploy
- [ ] nginx: `gzip` para `.glb`, cache largo para `/models/`, MIME.
- [ ] Peso, Lighthouse, 60 fps en notebook media.
- [ ] Revisar con el usuario y pedir el merge a `main`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El 3D pesa y espanta a quien tiene mala conexión | Carga lazy; fallback a video/poster; < 3 MB de modelos |
| Mobile con GPU débil | `useCellSupport`; versión estática o fallback en teléfonos |
| Pivotes mal medidos → piezas desfasadas | Medir con capturas headless y ajustar constantes; documentarlas |
| Metal oscuro invisible en tema oscuro | Entorno procedural + rim light verde (`brand-primary`) |
| El 3D desplaza el mensaje "contratame" | Nav y CTA siempre visibles; "Saltar al contenido" |
| Mantenimiento | Pocas dependencias, IK propia, modelos como assets estáticos |

## Cómo optimizar un modelo

```
npx @gltf-transform/cli simplify in.glb s.glb --ratio 0.03 --error 0.005
npx @gltf-transform/cli resize s.glb r.glb --width 1024 --height 1024
npx @gltf-transform/cli webp r.glb w.glb
npx @gltf-transform/cli meshopt w.glb out.glb
```

`useGLTF` de drei decodifica meshopt solo. Texturas WebP las soportan todos
los navegadores actuales.

## Bitácora

- 2026-10-08: plan creado; modelos listos; rama `dev`.
- 2026-10-08 (tarde): corrección de rumbo (ver arriba). Móvil: propuesta de
  laboratorio 2D (SVG con la misma IK, estilo plano técnico del Hero, tocar una
  caja abre un panel inferior) liviano y compatible con cualquier teléfono; o
  carga opt-in del 3D ("tocar para cargar, 9 MB"). A decidir con el usuario.
- 2026-10-08: fase 1 lista. Medidas de pivotes en `RobotArm.tsx`. Las escalas
  elegidas: base 0,8; segmento 1 = 1,0; segmento 2 = 0,85; garra 0,4; caja 0,26.
