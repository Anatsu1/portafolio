# Portafolio — César Augusto Fernández Carbonell

Portafolio personal single-page construido con **Vite + React 18 + TypeScript + Tailwind CSS**.

## Requisitos
- Node.js 18+

## Uso
```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # build de producción en /dist
npm run preview  # previsualizar el build
```

## Personalización
Todo el contenido (nombre, correo, redes, habilidades y proyectos) está centralizado en `src/data.ts`. Edita ese archivo para actualizar la página sin tocar los componentes.

- Colores y fuentes: `tailwind.config.ts`
- Secciones: `src/components/`
- CV descargable: coloca tu PDF en `public/cv-cesar-fernandez.pdf`

## Deploy
El proyecto genera archivos estáticos, compatible con Netlify, Vercel o GitHub Pages:
- Comando de build: `npm run build`
- Directorio de publicación: `dist`
# portafolio
