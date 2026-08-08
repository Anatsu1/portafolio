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
| **Mostrador** | HTML, CSS, JavaScript, PHP 8.1, MariaDB, Apache, Docker Compose, FPDF (remitos en PDF), spreadsheet-reader (importación de Excel) | `HTML5, CSS3, JavaScript, PHP, MySQL, Docker`. Apache, FPDF y el lector de planillas van en el resumen |
| **Manarem** | HTML, CSS, JavaScript, Python, Flask, SQLite, API de AniList (consumo para anime) | todas menos el consumo de la API, que va en el resumen |
| **BeaStore** | HTML, CSS, JavaScript, Java 21, Spring Boot 3.3, Spring Data MongoDB, Thymeleaf, Maven | `HTML5, CSS3, JavaScript, Java, Spring Boot, MongoDB`. Thymeleaf y Maven van en el resumen |
| **SATER** | VB.NET, Windows Forms, .NET Framework 4.5, Access/Jet, SQLite, Visual Studio 2012 | **sólo `SQLite`** |
| **VPS** | Docker, Traefik, Portainer, Cloudflare, Oracle Cloud, GitHub Actions, conexión SSH con restricciones, fail2ban, ufw, Uptime Kuma (monitorización), derivación de servicios → n8n, redis, postgres, web | solo las generales (Docker, Git, GitHub Actions); el resto se cuenta en el resumen de la ficha. **PostgreSQL no va**: acá es un servicio levantado, no un modelo de datos diseñado, y bajo el mismo tag confunde a quien filtra por bases de datos |
| **Portafolio** | HTML, CSS, React, TypeScript, Tailwind, Git, GitHub Actions | todas |

Estos ocho prueban las tecnologías concretas del árbol. Los agrupadores
(web, bd, sql, nosql, herramientas) y lo que todavía no tiene proyecto
(Next.js) se dibujan punteados a propósito.

> Los servicios propios del VPS (Traefik, Portainer, n8n, Redis, Uptime Kuma,
> Cloudflare, Nginx, Fail2Ban, UFW…) **no** son nodos del árbol: son piezas de
> esa infraestructura puntual, no skills transferibles que tenga sentido
> ofrecer como filtro. Los más reconocibles se listan como chips en el grupo
> DevOps de `TOOLBOX`, abajo.

> **Nota sobre SATER**: su `stack` incluye sólo `SQLite` a propósito. VB.NET,
> Windows Forms y Access no son nodos del árbol porque no son tecnologías
> que tenga sentido ofrecer como filtro en un portafolio de desarrollo web;
> se cuentan en el resumen de la ficha, igual que los servicios del VPS.

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
