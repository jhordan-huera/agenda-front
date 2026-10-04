import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // API de agenda-backend. En desarrollo, /api se redirige allí: mismo origen, sin CORS.
  const apiTarget = env.API_PROXY_TARGET || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss()],
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
