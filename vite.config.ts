import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Vite rechaza con 403 cualquier request cuyo Host no conozca (defensa
    // contra DNS rebinding). El punto inicial habilita los subdominios, así
    // que sirve para los túneles efímeros (dominio nuevo en cada corrida)
    // que usamos para probar en el teléfono sin estar en la misma red.
    // Sólo aplica a `npm run dev`: el build de producción lo sirve nginx.
    //
    // Van los dos proveedores a propósito: varios operadores móviles
    // argentinos NO resuelven *.trycloudflare.com (da NXDOMAIN desde datos,
    // aunque desde wifi ande), así que localhost.run queda como plan B.
    //   cloudflared tunnel --url http://localhost:5173
    //   ssh -R 80:localhost:5173 nokey@localhost.run
    allowedHosts: [".trycloudflare.com", ".lhr.life"],
  },
});
