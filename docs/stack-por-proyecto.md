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
| **UTN EA Necochea** | HTML, CSS, React, Node, Express, PostgreSQL, Docker, GitHub Actions | todas. Docker y GitHub Actions son del backend (`prog/backend/Dockerfile` y `.github/workflows/backend.yml`), que se despliega solo al VPS |
| **Mostrador** | HTML, CSS, JavaScript, PHP 8.1, MariaDB, Apache, Docker Compose, FPDF (remitos en PDF), spreadsheet-reader (importación de Excel) | `HTML5, CSS3, JavaScript, PHP, MySQL, Docker`. Apache, FPDF y el lector de planillas quedan fuera: el resumen de la ficha es comercial, no una lista de dependencias |
| **Manarem** | HTML, CSS, JavaScript, Python, Flask, PostgreSQL, Docker, Traefik, GitHub Actions, gunicorn, API de AniList (consumo para anime) | `HTML5, CSS3, JavaScript, Python, Flask, PostgreSQL, Docker, GitHub Actions`. Traefik, gunicorn y el consumo de la API van en el resumen. **Acá PostgreSQL sí va** (a diferencia del VPS): el esquema y las consultas son del proyecto, no un servicio levantado. **SQLite no va**: el backend lo soporta como modo local sin instalar nada, pero en producción corre sobre Postgres, y listar las dos confunde a quien filtra por base de datos |
| **BeaStore** | HTML, CSS, JavaScript, Java 21, Spring Boot 3.3, Spring Data MongoDB, Thymeleaf, Maven | `HTML5, CSS3, JavaScript, Java, Spring Boot, MongoDB`. Thymeleaf y Maven quedan fuera, por lo mismo que en Mostrador |
| **SATER** | VB.NET, Windows Forms, .NET Framework 4.5, Access/Jet, SQLite, Visual Studio 2012 | **sólo `SQLite`** |
| **VPS** | Docker, Traefik, Portainer, Cloudflare, Oracle Cloud, GitHub Actions, conexión SSH con restricciones, fail2ban, ufw, Uptime Kuma (monitorización), derivación de servicios → n8n, redis, postgres, web | solo las generales (Docker, Git, GitHub Actions); el resto se cuenta en el resumen de la ficha. **PostgreSQL no va**: acá es un servicio levantado, no un modelo de datos diseñado, y bajo el mismo tag confunde a quien filtra por bases de datos |
| **Portafolio** | HTML, CSS, React, TypeScript, Tailwind, Git, Docker, GitHub Actions | todas |

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
> VB.NET se nombra en el resumen de la ficha, igual que pasa con los
> servicios del VPS.

> **Los resúmenes de las fichas no son listas de tecnologías.** Dicen qué es
> el sistema, para quién y por qué existe — este es un portafolio de
> presentación, y quien lo lee decide en tres renglones (que es lo que se ve
> antes del "Ver más"). En particular: **nada de enumerar bugs, fallas o
> "problemas del código original"**, ni siquiera para mostrar que se
> arreglaron. Eso vive en el README del repositorio de cada proyecto.

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

## Por qué Docker y GitHub Actions están en tres fichas

Resuelto el 2026-08-26. Los tres proyectos que despliegan por pipeline —
Manarem, Portafolio y UTN EA Necochea — tienen Dockerfile **y** workflow, pero
durante un tiempo sólo Manarem los declaraba.

**Criterio: agregar, no sacar.** `Git` está a propósito sólo en Portafolio y
VPS porque lo usan todos y no distingue nada. Docker y GitHub Actions **no** son
universales acá — BeaStore, PrestARTE y SATER no tienen CI/CD — así que
marcarlos en los que sí despliegan contenedores por pipeline es información útil
para quien filtra, que es para lo que sirve el `stack`.

Dónde está cada uno, por si hace falta verificarlo:

| Proyecto | Dockerfile | Workflow |
|---|---|---|
| Manarem | raíz del repo | `.github/workflows/deploy.yml` |
| Portafolio | raíz del repo | `.github/workflows/deploy.yml` |
| UTN EA Necochea | `prog/backend/` | `.github/workflows/backend.yml` |
