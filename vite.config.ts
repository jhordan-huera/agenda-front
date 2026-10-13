import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * La hoja de estilos de la app, al final del <body>: el navegador dibuja antes la pantalla de carga
 * (index.html, con sus estilos en línea) sin esperarla. React no puede pintar sin estilos: los
 * scripts de módulo no se ejecutan mientras haya una hoja pendiente (regla de HTML).
 */
function stylesheetAfterBootScreen(): Plugin {
  return {
    name: "agenda:stylesheet-after-boot-screen",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const links = html.match(/[ \t]*<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>\n?/g) ?? [];
        let out = html;
        for (const link of links) out = out.replace(link, "");
        return links.length ? out.replace("</body>", `${links.map((link) => link.trim()).join("\n")}\n</body>`) : html;
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // API de agenda-backend. En desarrollo, /api se redirige allí: mismo origen, sin CORS.
  const apiTarget = env.API_PROXY_TARGET || "http://localhost:4000";

  return {
    plugins: [
      react(),
      tailwindcss(),
      stylesheetAfterBootScreen(),
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
          globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}", "assets/sora-latin-wght-*.woff2"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        devOptions: { enabled: false },
      }),
    ],
    // El worker de MapLibre es un módulo ES (ver src/components/shared/map-base.ts).
    worker: { format: "es" },
    resolve: {
      alias: [
        { find: "@", replacement: path.resolve(import.meta.dirname, "src") },
        // Todo "zod" pasa por src/lib/zod-config.ts: su configuración va antes de cualquier esquema y
        // Zod se descarga sólo con las pantallas que validan (no en la carga inicial).
        { find: /^zod$/, replacement: path.resolve(import.meta.dirname, "src/lib/zod-config.ts") },
      ],
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
