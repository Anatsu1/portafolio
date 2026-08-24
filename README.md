<div align="center">
  <img src="public/favicon.svg" alt="" width="72" height="72">
  <h1>augustofc_dev — Portafolio</h1>
  <p>
    Sitio personal de <strong>Cesar Augusto Fernandez Carbonell</strong>, desarrollador Full Stack — sistemas web a medida e IA.<br>
    React + Vite + TypeScript + Tailwind, servido como estáticos por nginx en un contenedor Docker.
  </p>
  <p>
    <a href="https://www.augustofc.com"><strong>www.augustofc.com</strong></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white" alt="React 18">
    <img src="https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white" alt="Vite 5">
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript 5">
    <img src="https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3">
  </p>
</div>

## Qué es

Una landing de una sola página (Inicio · Sobre mí · Proyectos · Contacto) pensada
con un objetivo concreto: **mostrar trabajo real y conseguir clientes/empleo**.
La dirección visual es la de un *vault* industrial —metal, remaches, planos
técnicos— en vez del típico portafolio corporativo genérico.

Lo que la hace distinta de una landing estática cualquiera:

- **Proyectos y skills unificados.** No hay barras de porcentaje: cada
  habilidad se demuestra con un proyecto. Las fichas de proyecto son *planos
  técnicos* (cajetín de metadatos, sello "CLIENTE"/"PERSONAL"/"CERTIFICACIÓN", carrusel de
  capturas y videos con tira `FIG. 01 / 03`, que avanza solo mientras el mouse
  está sobre la ficha y vuelve a la primera captura al salir — en teléfonos,
  donde no hay hover, rota la ficha que el scroll-snap dejó calzada).
- **Árbol de skills como filtro.** Una red de nodos con prerequisitos
  (`HTML5 → CSS3 → Tailwind`) que filtra las fichas de forma restrictiva (AND).
  Solo entran tecnologías que se usan de verdad en algún proyecto, y las skills
  "probadas" se derivan solas del `stack` de cada uno: no hay ninguna lista que
  mantener a mano. Las aristas SVG se miden del DOM real con `ResizeObserver`,
  así que quedan bien en cualquier breakpoint. Debajo, una fila informativa
  de herramientas que no se demuestran con un proyecto (editores, DevOps, Linux).
- **Hero con brazo robótico.** Video pre-renderizado a pantalla completa (una
  variante por tema), reveal del texto con GSAP y, en mobile, una cámara virtual
  que hace zoom y sigue la pinza.
- **Modo claro/oscuro sin clases `dark:`.** Variables CSS + tokens semánticos
  de Tailwind; el flip entero es una clase en `<html>`.
- **Respeta `prefers-reduced-motion`** (vía `MotionConfig reducedMotion="user"`):
  sin autoplay de video, sin scroll animado, sin parpadeos.

## Empezar

Requisitos: **Node.js 22+** y npm.

```bash
git clone https://github.com/Anatsu1/portafolio.git
cd portafolio
npm install
npm run dev
```

El sitio queda en http://localhost:5173.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Chequeo de tipos (`tsc -b`) + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente para verificar el build |

> [!TIP]
> Para probar en el teléfono sin estar en la misma red, `vite.config.ts` ya
> acepta hosts de túneles efímeros:
> ```bash
> cloudflared tunnel --url http://localhost:5173
> ssh -R 80:localhost:5173 nokey@localhost.run   # plan B: varios operadores móviles no resuelven trycloudflare.com
> ```

## Estructura

```
src/
  main.tsx                 Punto de entrada (monta <App /> dentro de ThemeProvider)
  App.tsx                  Composición de la página: layout + secciones
  index.css                Variables de tema, estilos globales, @layer components
  data.ts                  Contenido del sitio (textos, links, navegación)
  components/
    layout/                Piezas fijas: Navbar, Footer, PageLoader, ScrollProgress
    sections/              Bloques de la landing: Hero, About, Projects, Contact
      hero/                HeroArmVideo
      projects/            ProjectPlate, ProjectCarousel, SkillTree, SkillNodeButton
  data/
    projects/              Un archivo por proyecto + tipo Project compartido
    skillTree.ts           Nodos del árbol (requires/aliases) y sus derivados
    brandIcons.ts          Marcas monocromas de las herramientas de TOOLBOX
  hooks/                   Toda la lógica con estado (tema, carruseles, slider, GSAP…)
  assets/                  Videos del brazo + capturas por proyecto
```

Convención: si un componente necesita más que un toggle trivial de estado, la
lógica se extrae a `src/hooks/`; el componente queda enfocado en el JSX.

## Editar el contenido

Todo el contenido editorial vive en datos, nunca hardcodeado en un componente.

| Necesito… | Voy a… |
|---|---|
| Cambiar textos, links o navegación | `src/data.ts` |
| Agregar un proyecto | Archivo nuevo en `src/data/projects/` + una línea en `index.ts`, capturas en `src/assets/<id-del-proyecto>/` |
| Saber qué tecnología usa cada proyecto | `docs/stack-por-proyecto.md` (fuente de verdad de los `stack` y de los nodos) |
| Agregar una skill o cambiar prerequisitos | `src/data/skillTree.ts` (`SKILL_NODES`) |
| Agregar una herramienta informativa (editor, SO) | `src/data/skillTree.ts` (`TOOLBOX`) + su marca en `src/data/brandIcons.ts` — no filtra proyectos |
| Cambiar colores de marca o el tema | `src/index.css` (variables) y `tailwind.config.ts` (tokens) |
| Permitir copiar un texto nuevo | Clase `select-text` en ese elemento — el sitio va con `select-none` global (`src/index.css`) |
| Cómo se sirve/despliega | `nginx.conf`, `Dockerfile`, `.github/workflows/deploy.yml` |

> [!IMPORTANT]
> Cada string del `stack` de un proyecto tiene que coincidir con el `label` o un
> alias de un nodo del árbol de skills. En desarrollo, `resolveStack` avisa por
> consola si alguno no matchea — ojo con las herramientas de `TOOLBOX`, que no
> son nodos y por lo tanto no pueden ir en un `stack`. El árbol sí puede tener
> nodos sin proyecto todavía: se dibujan punteados.
> [`docs/stack-por-proyecto.md`](docs/stack-por-proyecto.md) define qué queda
> *probado*, no qué nodos existen.

Guía completa de arquitectura y decisiones de diseño: [AGENTS.md](AGENTS.md).

## Producción

La imagen es multi-stage: build con Node 22, y nginx sirviendo `dist/` como
estáticos (fallback SPA a `index.html`, cache inmutable para los assets con hash
de Vite, gzip).

```bash
docker build -t portfolio .
docker run --rm -p 8080:80 portfolio
```

### Despliegue (CI/CD)

El servicio **no se construye en el servidor**. Un push a `main` dispara todo:

```
push a main
    │
GitHub Actions (.github/workflows/deploy.yml)
    │  1. npm ci + vite build, nativos en el runner (amd64)
    │  2. el dist entra en una imagen ARM64 de nginx — el VPS es ARM
    │  3. push a ghcr.io/anatsu1/portfolio:latest
    ▼
SSH al VPS (usuario deploy)
    │
docker compose pull && docker compose up -d
```

Infraestructura: VPS en Oracle Cloud, dominio `augustofc.com` vía Traefik
(el apex redirige a `www`). El contenedor es stateless: todo el contenido viene
de la imagen.

> [!WARNING]
> El workflow solo dispara con push a `main`, y ese push es un **deploy real a
> producción**. El trabajo en curso va en `dev`.

Deploy manual, si hiciera falta:

```bash
cd /srv/infrastructure/portfolio
docker compose pull && docker compose up -d
```

> [!IMPORTANT]
> Las imágenes base del `Dockerfile` van **pineadas por digest**, y el build de
> Node corre con `--platform=$BUILDPLATFORM`, o sea nativo en el runner. Las dos
> cosas arreglan el mismo incidente: el 2026-08-21 Docker republicó
> `node:22-alpine`, el Node nuevo usaba instrucciones que QEMU en modo usuario no
> implementa, y `npm ci` moría con `illegal instruction`. El deploy quedó roto 15
> días sin que cambiara una línea del repo. El `dist` de Vite son estáticos
> iguales en cualquier arquitectura, así que emular Node nunca hizo falta.
>
> Para subir una base, resolvé el digest del índice multi-arch y reemplazalo:
>
> ```bash
> docker buildx imagetools inspect node:22-alpine | head -2
> ```
>
> Tiene que ser el digest del **índice** (`amd64` + `arm64`), no el de un
> manifest de una sola arquitectura: si pineás uno solo, falla la etapa que
> necesita la otra.

> [!NOTE]
> El tag `latest` es una excepción deliberada a la política de versiones fijas:
> la imagen es propia y cada `latest` corresponde exactamente al último commit en
> `main`. Los deploys dejan imágenes huérfanas — limpiar de vez en cuando con
> `docker image prune -f`.

## Contacto

- Web: [www.augustofc.com](https://www.augustofc.com)
- Email: contacto@augustofc.com
- LinkedIn: [cesar-augusto-fernandez-carbonell](https://www.linkedin.com/in/cesar-augusto-fernandez-carbonell/)
- GitHub: [@Anatsu1](https://github.com/Anatsu1)
