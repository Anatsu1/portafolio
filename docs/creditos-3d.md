# Créditos de assets 3D

## Entorno "Bosque": todo propio

Desde el rediseño "puesto de campo" el bosque ya no usa modelos de terceros:
se sacó `public/models/bosque/bosque.glb` (Kenney Nature Kit 2.1, CC0), cuyas
flores, rocas, hongos, troncos y lajas low-poly desentonaban de cerca con el
brazo. Ahora todo es procedural y propio (`src/components/sections/celda/forest*.ts`):
árboles, sotobosque (`forestFlora.ts`), plataforma de acero (`forestPad.ts`) y
el equipamiento industrial (`forestIndustry.ts`, `forestConveyor.ts`). Las
cajas que viajan por la cinta reusan `public/models/caja-lite.glb`.

## Kenney — Factory Kit

- Autor: Kenney (www.kenney.nl)
- Licencia: Creative Commons Zero (CC0 1.0).
- Uso: entorno "Línea de montaje" (escáner `scanner-high`, selladora
  `machine-window` y válvulas `pipe-large-valve`), juntados en
  `public/models/linea/kit.glb` con un material recoloreado propio.
  (El brazo `robot-arm-a` del kit ya no se usa: el brazo de la línea es el
  paletizador procedural.)

## Línea de montaje: piezas propias

Sin descargas nuevas. Son procedurales y propios: piso con texturas de canvas,
plataforma giratoria, brazo paletizador, autoelevador, pallets, operarios
(figuras con esqueleto armadas en código) y puerta C
(`src/components/sections/celda/Assembly*.tsx`, `assembly*.ts`).
`public/models/linea/caja-far.glb` es la caja de carga del proyecto
simplificada (meshopt, texturas de 256 px) para las cajas lejanas de los pallets.
