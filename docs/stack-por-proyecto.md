# Stack por proyecto

Fuente de verdad de qué tecnología usa cada proyecto. De acá salen dos cosas:

- El `stack` de cada archivo en `src/data/projects/` (los tags del cajetín de
  la ficha).
- Los nodos del árbol de skills (`src/data/skillTree.ts`), que solo puede
  contener tecnologías que estén en esta lista — nada de relleno.

Todos los proyectos están versionados en repos de Git.

## Proyectos cargados en el sitio

| Proyecto | Tecnologías | En `stack` |
|---|---|---|
| **PrestARTE** | HTML, CSS, JavaScript, Bootstrap | todas |
| **UTN EA Necochea** | HTML, CSS, React, Node, Express, PostgreSQL | todas |
| **Portafolio** | HTML, CSS, React, TypeScript, Tailwind, Git, GitHub Actions | todas |

## Proyectos pendientes de cargar

| Proyecto | Tecnologías | En `stack` |
|---|---|---|
| **Manarem** | HTML, CSS, JavaScript, Python, Flask, SQLite, API de AniList (consumo para anime) | todas menos el consumo de la API, que va en el resumen |
| **VPS** | Docker, Traefik, Portainer, Cloudflare, Oracle Cloud, GitHub Actions, conexión SSH con restricciones, fail2ban, ufw, Uptime Kuma (monitorización), derivación de servicios → n8n, redis, postgres, web | solo las generales (Docker, GitHub Actions, PostgreSQL); el resto se cuenta en el resumen de la ficha |

> Los servicios propios del VPS (n8n, redis, uptime kuma, fail2ban, ufw…) **no**
> son nodos del árbol: son piezas de esa infraestructura puntual, no skills
> transferibles que tenga sentido ofrecer como filtro.

## Herramientas (informativas, no son filtro)

Se muestran debajo del árbol, sin ser nodos: no se "prueban" con un proyecto,
pero suman al perfil. Viven en `TOOLBOX`, en `src/data/skillTree.ts`.

- **Editores e IDE:** VS Code, Cursor, IntelliJ IDEA
- **Sistemas:** Linux
