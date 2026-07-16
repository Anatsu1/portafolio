# Portfolio

## Objetivo

Sitio web personal (React + Vite + TypeScript + Tailwind),
servido como estáticos por nginx.

## Acceso

https://www.augustofc.com
(augustofc.com redirige a www mediante middleware de Traefik)

## Despliegue (CI/CD)

Este servicio NO se construye en el servidor. El flujo es:

    push a main (repo del portfolio)
        │
    GitHub Actions
        │  build imagen ARM64
        ▼
    ghcr.io/anatsu1/portfolio:latest
        │
    SSH (usuario deploy)
        ▼
    docker compose pull && up -d

- Repo de la aplicación: github.com/Anatsu1/<repo-portfolio>
- Workflow: .github/workflows/deploy.yml (en el repo de la app)
- Usuario de deploy en el VPS: deploy (clave SSH en secrets del repo)

Para desplegar manualmente si hiciera falta:

    cd /srv/infrastructure/portfolio
    docker compose pull && docker compose up -d

## Persistencia

Ninguna. Contenedor sin estado: todo el contenido viene de la imagen.

## Notas

- La etiqueta `latest` es una excepción deliberada a la política de
  versiones fijas: la imagen es propia y cada `latest` corresponde
  exactamente al último commit en main.
- Los deploys dejan imágenes huérfanas; limpiar ocasionalmente con
  `docker image prune -f`.

## Dependencias

- Traefik
- Red externa: server-ubuntu-network
- GitHub Actions + ghcr.io

## Estado

Producción
