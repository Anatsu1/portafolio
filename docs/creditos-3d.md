# Créditos de assets 3D

## Kenney — Nature Kit 2.1

- Autor: Kenney (www.kenney.nl)
- Licencia: Creative Commons Zero (CC0 1.0). No exige atribución; se agradece igual.
- Uso: entorno "Bosque" de la celda del brazo robótico.
- Archivo en el repo: `public/models/bosque/bosque.glb`. Empaqueta en un solo GLB
  los modelos de abajo, uno por nodo (con el nombre original). Se hornearon los
  colores de material a color de vértice con una paleta propia, se unificó el
  material y se optimizó con gltf-transform (dedup, weld, prune, quantize y
  compresión meshopt).

Modelos usados:

| Modelo | Uso |
| --- | --- |
| `flower_yellowA`, `flower_yellowB` | Flores silvestres amarillas |
| `flower_purpleA`, `flower_purpleB` | Flores silvestres violetas |
| `flower_redA`, `flower_redB` | Flores silvestres rojas |
| `mushroom_redGroup`, `mushroom_tanGroup`, `mushroom_red` | Hongos al pie de árboles y troncos |
| `rock_largeA`, `rock_largeB`, `rock_smallA`, `rock_smallB`, `rock_smallC` | Rocas con musgo |
| `log_large`, `log` | Troncos caídos |
| `stump_old`, `stump_roundDetailed` | Tocones |
| `path_stone` | Lajas del sendero |

Todo lo demás del bosque (árboles, arbustos, pasto, helechos, suelo, texturas,
haces de luz y partículas) es procedural y propio (`src/components/sections/celda/forest*.ts`).
