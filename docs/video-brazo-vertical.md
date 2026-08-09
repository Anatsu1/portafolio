# Video del brazo, versión vertical (9:16) para celular

Documento de trabajo para generar el clip que falta. Todo lo demás del Hero
ya está preparado para recibirlo.

## Por qué hace falta

El clip actual (`src/assets/arm-{light,dark}.mp4`) es **16:9**. La pantalla de
un celular es ~9:19. Como el video se muestra con `object-cover`, en vertical
se recorta cerca del **70% del ancho del frame**: se ve un pedazo del brazo
pasando por detrás del texto, no la animación.

Hoy eso se compensa con `useArmFollowCam`, una "cámara" que hace zoom y
sigue la pinza. Es un parche: mejora el recorte pero no puede inventar el
encuadre que el render no tiene. **No hay ajuste de CSS que arregle una
animación compuesta para horizontal.** La única solución real es un render
compuesto para vertical.

## La restricción que manda sobre todo: dónde va la celda

El Hero tiene un **aura** (`lightRef` en `Hero.tsx`) que se enciende cuando el
brazo suelta el círculo. Su núcleo es del color de **fondo de la página**, y
su trabajo es **tapar por completo el cuadrado con el círculo** que el video
deja en la celda: se funde con el fondo real y el cuadrado desaparece. Por eso
el aura vive detrás del bloque de texto.

**Consecuencia:** la celda del render vertical tiene que caer **donde va el
nombre**. Si queda en otro lado, el aura no la tapa y se ve un cuadrado
flotando en el medio de la pantalla.

En el clip horizontal la celda está en **x≈20% / y≈32%** del frame. Para el
vertical el objetivo es:

```
┌───────────────────────────┐  ← 1080 × 1920 (9:16)
│                           │
│   ▓ ← celda (cuadrado     │  celda: x ≈ 25%, y ≈ 22%
│       con círculo)        │  ZONA DE TEXTO: el 55% de
│                           │  arriba va casi vacío — ahí
│      (fondo vacío)        │  se dibuja el nombre y el
│                           │  scrim lo oscurece.
│                           │
├───────────────────────────┤  ← ~55%
│         ╱|                │
│      ╱   |   ← el brazo   │  ZONA DE MÁQUINA: el 45% de
│   ╱      |     ocupa      │  abajo es lo único que se ve
│  [====]  |     grande     │  sin scrim. Acá el brazo tiene
│  ▭ ○ △ ▭ ← cinta          │  que verse GRANDE y completo.
└───────────────────────────┘
```

El brazo **sube** desde la cinta de abajo hasta la celda de arriba: en
vertical ese gesto ascendente es más dramático que el lateral del horizontal,
y deja el centro libre para el texto.

> Los porcentajes son el objetivo de composición, no un número sagrado.
> Cuando el render exista hay que **medir la posición real de la celda sobre
> frames del clip** y ajustar el CSS, igual que se hizo con el horizontal
> (los `14vw` / `18vw` de `Hero.tsx` salieron de medir, no de estimar).

## Requisitos duros

| | |
|---|---|
| Formato | 1080 × 1920, 9:16, mp4 (h264) |
| Duración | ~8 s (igual que el horizontal, para que `DROP_TIME` siga sirviendo) |
| Audio | **ninguno** |
| Texto | **ninguno** — el nombre lo pone el sitio por encima |
| Variantes | **dos**: `light` (azul `#2563eb` sobre fondo casi blanco) y `dark` (verde `#22c55e` sobre negro `#080b09`) |
| Movimiento | idéntico en las dos variantes: sólo cambia la paleta |
| El "drop" | el brazo suelta el círculo en la celda alrededor del **segundo 4,4** |
| Peso final | 1–1,5 MB por variante después del encode |
| Último frame | pose de reposo estable: el navegador lo retiene cuando el video termina |

## Intento 1 (2026-08-09) — qué salió y qué falló

`Robotic_arm_moving_shape_202608090253.mp4`, 720×1280, 8s, 24fps.

**Bien**: 9:16 real, sin texto ni audio, cinta pegada al borde de abajo con
las figuras, brazo grande entrando desde la derecha, brazo en gris y sólo la
celda en verde. El movimiento es exactamente el pedido.

**Mal, y es lo único que lo invalida**: la celda quedó en **x 7,5% / y 37,4%**
del frame (medido buscando los píxeles verdes sobre frames reales, no a ojo),
con su borde izquierdo **tocando el x=0 del render**. Además se enciende a
los ~5,1s, no a los 4,4s.

Por qué eso rompe: en un teléfono de 390×844 el video se muestra con
`object-cover`, escala a 475px de ancho y se recortan 42px de cada lado — la
celda cae **fuera de pantalla**. El remate de la animación (el brazo entrega
el círculo y la celda se enciende) no se vería, y el aura del Hero se quedaría
sin nada que tapar.

Cómo medir esto en el próximo render, sin estimar a ojo:

```bash
ffmpeg -v error -ss 5.5 -i render.mp4 -vframes 1 -q:v 2 celda.png
python3 -c "
from PIL import Image
im = Image.open('celda.png').convert('RGB'); W,H = im.size; px = im.load()
xs=[];ys=[]
for y in range(0,H,2):
  for x in range(0,W,2):
    r,g,b = px[x,y]
    if g>100 and g-r>35 and g-b>35: xs.append(x);ys.append(y)
cx=(min(xs)+max(xs))/2; cy=(min(ys)+max(ys))/2
print('centro x=%.1f%% y=%.1f%%' % (100*cx/W, 100*cy/H))"
```

(Para la variante clara, cambiar el criterio de color al azul.)

## Prompt para Google Flow / Veo (versión 2)

Mismo prompt para las dos variantes, cambiando sólo el último párrafo. La
ubicación de la celda va al principio y con una restricción explícita de
margen, porque en el intento 1 Veo la pegó al borde.

```
Vertical 9:16 technical blueprint animation, 1080x1920, clean line art, no
text, no labels, no logos, no watermarks.

THE CELL — this is the most important element and its position is strict:
a small square outline with a circle inside it, sitting in the UPPER LEFT
QUADRANT of the frame. Its centre must be about 28% of the frame width in
from the left edge and about 24% of the frame height down from the top. It
must be FULLY INSIDE the frame with a wide empty margin to its left — never
touching, never crossing and never being clipped by the left edge. It starts
dark and inert.

Composition: the TOP HALF of the frame is nearly empty background except for
that cell and the arm arcing across it. The BOTTOM 40% holds the machinery:
a horizontal conveyor belt running across the very bottom carrying outlined
geometric shapes (triangle, circle, square, rectangle) drifting slowly to the
left, and a large industrial robotic arm mounted on a heavy base at the
bottom right, drawn in thin technical-drawing line style with dashed
centrelines, bolt circles and dimension marks.

Action, exactly 8 seconds, one single continuous shot, locked static camera,
no cuts, no zoom, no camera movement: the arm reaches down to the conveyor
belt and its gripper closes on the outlined circle at about 2 seconds. It
lifts the circle and rises in a smooth arc up and to the left across the
empty upper half. At exactly 4.4 seconds the gripper releases the circle into
the square cell and the cell lights up. The arm then retracts back down to a
resting pose above the belt and holds perfectly still for the final second.

Style: engineering blueprint, thin uniform strokes, flat, no shading, no
gradients, no depth of field, no photographic texture, no lens effects. The
background is a solid flat colour with a faint dotted technical grid.

[PALETA]
```

**Bloque `[PALETA]` para la variante oscura:**

```
Colour: near-black background (#080b09), all line work in light grey/white.
Only the cell carries colour, and only after the delivery: it glows green
(#22c55e).
```

**Bloque `[PALETA]` para la variante clara:**

```
Colour: near-white background (#ffffff), all line work in mid grey. Only the
cell carries colour, and only after the delivery: it glows royal blue
(#2563eb).
```

> El brazo va en **gris**, no en el color de marca: el color se reserva para
> la celda. Si el brazo entero viene pintado, pelea con el texto que va
> encima. El intento 1 acertó en esto.

## Plan B si la celda vuelve a salir corrida

Se puede adaptar el layout al render en vez de al revés, y de hecho queda una
composición mejor que la actual: en mobile el video pasa a `object-contain`
(no recorta nada, y como el fondo del render es el mismo negro/blanco que el
del sitio las bandas de arriba y abajo son invisibles) y el bloque de texto
baja para que **el nombre caiga justo sobre la celda**. Queda: brazo cruzando
en arco arriba, nombre encendiéndose en el medio, cinta abajo — y desaparece
el hueco muerto que hoy tiene el Hero mobile entre las redes y la cinta.

El costo es recalibrar a mano la posición del texto contra el render nuevo.

## Encode

El render de Flow viene pesado y con ruido de compresión. Misma receta que se
usó para el horizontal:

```bash
ffmpeg -i render-vertical-dark.mp4 \
  -vf "hqdn3d=4:3:6:4,scale=1080:1920:flags=lanczos" \
  -an -c:v libopenh264 -b:v 1200k -profile:v high \
  -movflags +faststart \
  src/assets/arm-dark-portrait.mp4
```

`hqdn3d` es el denoise (sube muchísimo la compresión en line art plano), `-an`
saca el audio y `+faststart` mueve el índice al principio para que empiece a
reproducir sin descargar todo.

Poster (frame 0, es lo que se ve mientras bufferea y con
`prefers-reduced-motion`):

```bash
ffmpeg -i src/assets/arm-dark-portrait.mp4 -vframes 1 -q:v 3 \
  src/assets/arm-dark-portrait-poster.jpg
```

Repetir las dos órdenes para `light`. Quedan cuatro archivos:

```
src/assets/arm-light-portrait.mp4
src/assets/arm-light-portrait-poster.jpg
src/assets/arm-dark-portrait.mp4
src/assets/arm-dark-portrait-poster.jpg
```

Verificar el peso antes de commitear: `du -h src/assets/arm-*-portrait.mp4`.
Si pasa de 1,5 MB, bajar `-b:v` a 900k y volver a mirar.

## Qué hay que cambiar en el código cuando lleguen los archivos

1. `HeroArmVideo.tsx`: agregar los cuatro imports y elegir la variante por
   `isMobile` (el `matchMedia("(max-width: 767px)")` que ese componente **ya
   calcula**) además de por tema. El `key` del `<video>` tiene que pasar a
   depender también de la orientación, para que al rotar el teléfono recargue
   el `<source>` correcto.
2. **Apagar `useArmFollowCam`**: existe sólo para compensar el recorte del
   16:9 en vertical. Con un render vertical de verdad, el zoom sobra y encima
   pelea con el encuadre. Se le pasa `enabled: false` (o se saca la llamada);
   el hook se puede conservar por si hay que volver atrás.
3. Medir sobre frames reales dónde queda la celda y ajustar la posición del
   bloque de texto en mobile — hoy en mobile el texto va en flujo normal, así
   que puede alcanzar con mover el `pt-*` de la `<section>`.
4. Revisar el scrim: hoy en mobile es `bg-gradient-to-b from-background
   via-background/85 to-transparent`, pensado para tapar arriba y dejar ver
   abajo. Con el render nuevo hay que confirmar que el punto en que se vuelve
   transparente coincida con donde empieza la máquina.
5. Actualizar `AGENTS.md`: la sección del video y la del breakpoint `md`
   mencionan la cámara de mobile como la solución al recorte.

## Si el render no sale como se pidió

Vale la pena insistir con Flow hasta que la celda quede arriba a la izquierda
y el brazo abajo. Es la única parte no negociable: el resto (qué tan grande
el brazo, cuántas figuras en la cinta) es gusto. Un render lindo con la celda
en el centro obliga a mover todo el bloque de texto y a recalibrar el aura.
