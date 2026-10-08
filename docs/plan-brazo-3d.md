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

Total ~2,4 MB. Escena: base + 2 segmentos + cuerpo + 2 dedos + 5 cajas ≈
~150k triángulos con instancias. Presupuesto: < 200k tris, < 3 MB de modelos.

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
- [ ] `useCellController` (máquina de estados + cola).
- [ ] Click en caja → el brazo la trae (manual).
- [ ] Opcional: arrastrar la pinza con el mouse.
- [ ] Cursor y hover sobre cajas (resaltado con emissive).

### Fase 4 — Paneles laterales
- [ ] `SidePanel` estilo HUD (barra de progreso, título, contenido).
- [ ] Contenido por sección desde `data/cell.ts` + enlaces a las secciones
  reales (`#proyectos`, `#contacto`).
- [ ] La caja Proyectos abre el árbol de skills / filtro.
- [ ] Teclado: Esc cierra, flechas navegan, Tab accesible.
- [ ] Botón "Saltar al contenido".

### Fase 5 — Integración con el sitio
- [ ] Decidir si la celda reemplaza el video del Hero en desktop (con
  fallback a video en mobile). Si sí: rehacer el layout del Hero.
- [ ] Sincronizar con `PageLoader` (puertas de vault).
- [ ] Revisar mobile: fallback o versión simplificada (sin IK manual).
- [ ] Accesibilidad: `aria`, `prefers-reduced-motion`, foco.

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
- 2026-10-08: fase 1 lista. Medidas de pivotes en `RobotArm.tsx`. Las escalas
  elegidas: base 0,8; segmento 1 = 1,0; segmento 2 = 0,85; garra 0,4; caja 0,26.
