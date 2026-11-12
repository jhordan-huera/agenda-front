import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { robotsTxt, siteUrlFrom, sitemapXml, SPECIALTY_HTML_DIR, specialtyHtml } from "./scripts/specialty-pages.ts";
import { SPECIALTIES } from "./src/features/landing/specialties.ts";

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

/**
 * Las páginas por especialidad (spec 041) para Google y para compartir: un HTML por especialidad con su título,
 * su descripción y sus etiquetas para la vista previa (vercel.json sirve cada dirección con el suyo), el mapa del
 * sitio y robots.txt. Ver scripts/specialty-pages.ts.
 */
function specialtyPages(siteUrl: string): Plugin {
  return {
    name: "agenda:specialty-pages",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset") throw new Error("No encontré index.html en el build para las páginas por especialidad.");
      const html = String(index.source);
      for (const specialty of SPECIALTIES) {
        this.emitFile({ type: "asset", fileName: `${SPECIALTY_HTML_DIR}/${specialty.slug}.html`, source: specialtyHtml(html, specialty, siteUrl) });
      }
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(siteUrl) });
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(siteUrl) });
    },
  };
}

/**
 * Ningún mapa de código en lo que se publica (spec 044): los mapas sólo se suben a Sentry. Va al final, después
 * del plugin de Sentry, que ya los borra al subirlos: éste borra lo que quede y falla si no puede.
 */
function withoutSourceMaps(): Plugin {
  let outDir = "dist";
  return {
    name: "agenda:sin-mapas",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle: {
      order: "post",
      sequential: true,
      handler() {
        const maps = () => readdirSync(outDir, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".map"));
        for (const file of maps()) rmSync(path.join(outDir, file));
        const left = maps();
        if (left.length) throw new Error(`Quedaron mapas de código en ${outDir}: ${left.join(", ")}`);
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // API de agenda-backend. En desarrollo, /api se redirige allí: mismo origen, sin CORS.
  const apiTarget = env.API_PROXY_TARGET || "http://localhost:4000";
  // Avisos de errores (spec 044): la versión es el commit que publica Vercel. Los mapas de código se crean
  // con SENTRY_AUTH_TOKEN (en Vercel: se suben a Sentry) o con SOURCEMAPS=local (para comprobar en este
  // equipo que no se publican, sin subirlos). Sin ninguno de los dos, no hay mapas, como antes.
  const release = env.VERCEL_GIT_COMMIT_SHA ?? "";
  const uploadMaps = Boolean(env.SENTRY_AUTH_TOKEN);
  const sourceMaps = uploadMaps || env.SOURCEMAPS === "local";

  return {
    plugins: [
      react(),
      tailwindcss(),
      stylesheetAfterBootScreen(),
      specialtyPages(siteUrlFrom(env)),
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
      ...(sourceMaps
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              telemetry: false,
              release: { name: release || undefined, inject: false, setCommits: false, deploy: false },
              sourcemaps: {
                disable: uploadMaps ? false : "disable-upload",
                filesToDeleteAfterUpload: ["dist/**/*.map"],
              },
            }),
          ]
        : []),
      withoutSourceMaps(),
    ],
    define: { "import.meta.env.VITE_RELEASE": JSON.stringify(release) },
    build: { sourcemap: sourceMaps ? "hidden" : false },
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
