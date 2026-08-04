import type { Project } from "./types";
import capture01 from "../../assets/vps/vps-01.jpg";
import capture02 from "../../assets/vps/vps-02.jpg";
import capture03 from "../../assets/vps/vps-03.jpg";

// Capturas de los paneles del propio servidor, con los datos sensibles
// pixelados ANTES de entrar al repo: versiones exactas de las imágenes
// (le dicen a un atacante qué CVEs probar), IPs de la red interna, el
// usuario de Portainer y el id de sesión de n8n. Si se reemplazan, repetir
// la censura — este proyecto es infraestructura viva, no una demo.
//
// Las dos primeras son 1909×960 re-escaladas a 1440×724; la de n8n es
// 1024×576 rellenada a 1145×576 con el gris del lienzo para compartir
// proporción con las otras (el escenario del carrusel usa una sola).
const ASPECT = "1909 / 960";

export const vps: Project = {
  id: "vps",
  title: "Infraestructura VPS personal",
  role: "personal",
  status: "activo",
  featured: false,
  summary:
    "Servidor propio en Oracle Cloud (Ubuntu Server LTS, ARM) montado por " +
    "capas: primero el sistema endurecido —SSH con restricciones, UFW, " +
    "Fail2Ban y actualizaciones desatendidas—, después Docker y Docker " +
    "Compose como infraestructura como código. Traefik es el único " +
    "contenedor expuesto y enruta por dominio; ningún servicio publica " +
    "puertos, todo viaja por una red interna de Docker, y Cloudflare pone " +
    "DNS, CDN, SSL y WAF por delante. Encima corren servicios compartidos " +
    "(PostgreSQL y Redis), administración y monitoreo (Portainer, Uptime " +
    "Kuma) y automatizaciones con n8n. El despliegue es CI/CD: push a " +
    "GitHub, Actions arma la imagen y el servidor hace pull y levanta —" +
    "nada de copiar archivos por SSH a mano. Este mismo portafolio se " +
    "publica así.",
  // Solo tecnologías generales, las que son nodo del árbol. Los servicios
  // puntuales del server (Traefik, Portainer, Cloudflare, n8n, Redis,
  // Uptime Kuma, UFW, Fail2Ban) se cuentan en el resumen: son piezas de
  // esta arquitectura, no skills que quiera ofrecer como filtro.
  //
  // PostgreSQL tampoco va, aunque el server lo tenga corriendo: acá es un
  // servicio levantado y mantenido, no un modelo de datos diseñado como en
  // un proyecto web. Mezclar las dos cosas bajo el mismo tag confunde a
  // quien filtra por "bases de datos" esperando ver esquemas y consultas.
  stack: ["Docker", "Git", "GitHub Actions"],
  // Sin links a propósito: los paneles son privados y publicar sus URLs
  // solo suma superficie de ataque sobre un server que está en producción.
  links: {},
  media: [
    { type: "image", src: capture01, aspect: ASPECT }, // Portainer: los contenedores en marcha
    { type: "image", src: capture02, aspect: ASPECT }, // Traefik: entrypoints, routers y servicios
    { type: "image", src: capture03, aspect: ASPECT }, // n8n: un workflow de automatización
  ],
};
