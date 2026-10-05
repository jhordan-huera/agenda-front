import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // API de agenda-backend. En desarrollo, /api se redirige allí: mismo origen, sin CORS.
  const apiTarget = env.API_PROXY_TARGET || "http://localhost:4000";

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Aplicación instalable: service worker propio (src/sw.ts) con la lista de archivos de cada
      // versión. El manifiesto es public/manifest.webmanifest y lo enlaza sólo el panel
      // (src/lib/installable-app.ts), no la portada ni la página de reservas.
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        manifest: false,
        injectRegister: false,
        injectManifest: {
          // La letra, sólo en alfabeto latino (las otras variantes no se usan en español).
          globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}", "assets/plus-jakarta-sans-latin-wght-*.woff2"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        devOptions: { enabled: false },
      }),
    ],
    // El worker de MapLibre es un módulo ES (ver src/components/shared/map-base.ts).
    worker: { format: "es" },
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": { target: apiTarget, changeOrigin: true } },
    },
    preview: {
      port: 5173,
      strictPort: true,
      proxy: { "/api": { target: apiTarget, changeOrigin: true } },
    },
  };
});
