# Stack por proyecto

Fuente de verdad de qué tecnología usa cada proyecto. De acá salen dos cosas:

- El `stack` de cada archivo en `src/data/projects/` (los tags del cajetín de
  la ficha).
- Qué nodos del árbol de skills (`src/data/skillTree.ts`) quedan **probados**:
  los que aparecen acá se dibujan con borde sólido, el resto punteado. El
  árbol sí puede tener nodos que no estén en esta lista (el mapa muestra el
  recorrido completo, no solo lo publicado).

Todos los proyectos están versionados en repos de Git.

## Proyectos cargados en el sitio

| Proyecto | Tecnologías | En `stack` |
|---|---|---|
| **PrestARTE** | HTML, CSS, JavaScript, Bootstrap | todas |
| **UTN EA Necochea** | HTML, CSS, React, Node, Express, PostgreSQL | todas |
| **VPS** | Docker, Traefik, Portainer, Cloudflare, Oracle Cloud, GitHub Actions, conexión SSH con restricciones, fail2ban, ufw, Uptime Kuma (monitorización), derivación de servicios → n8n, redis, postgres, web | solo las generales (Docker, Git, GitHub Actions); el resto se cuenta en el resumen de la ficha. **PostgreSQL no va**: acá es un servicio levantado, no un modelo de datos diseñado, y bajo el mismo tag confunde a quien filtra por bases de datos |
| **Manarem** | HTML, CSS, JavaScript, Python, Flask, SQLite, API de AniList (consumo para anime) | todas menos el consumo de la API, que va en el resumen |
| **Portafolio** | HTML, CSS, React, TypeScript, Tailwind, Git, GitHub Actions | todas |

Estos cinco prueban las tecnologías concretas del árbol. Los agrupadores
(web, bd, sql, nosql, herramientas) y lo que todavía no tiene proyecto
(Next.js, MySQL, MongoDB) se dibujan punteados a propósito.

> Los servicios propios del VPS (Traefik, Portainer, n8n, Redis, Uptime Kuma,
> Cloudflare, Nginx, Fail2Ban, UFW…) **no** son nodos del árbol: son piezas de
> esa infraestructura puntual, no skills transferibles que tenga sentido
> ofrecer como filtro. Los más reconocibles se listan como chips en el grupo
> DevOps de `TOOLBOX`, abajo.

## Herramientas (informativas, no son filtro)

Se muestran debajo del árbol, sin ser nodos: cambiar de editor, de asistente
de IA o de sistema no habilita nada aguas abajo, así que no son parte del
recorrido. Viven en `TOOLBOX`, en `src/data/skillTree.ts`.

- **Editores e IDE:** VS Code, Cursor, IntelliJ IDEA
- **IA:** Claude Code, opencode
- **DevOps:** Nginx, Traefik, Cloudflare, Portainer, n8n, Redis, Uptime Kuma
- **Sistemas:** Linux, Bash

Cada chip lleva la marca monocroma de la herramienta; los paths están en
`src/data/brandIcons.ts` y se pintan con `currentColor`, así que sirven igual
en tema claro y oscuro. Docker, Git y GitHub Actions **sí** son nodos del
árbol (rama `herramientas`), porque hay proyectos que los prueban y tiene
sentido filtrar por ellos.
