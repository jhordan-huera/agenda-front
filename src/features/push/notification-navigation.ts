import { router } from "@/app/router";
import { isPanelPath } from "@/lib/auth/next-path";

/**
 * Al tocar un aviso con la app ya abierta, el service worker (src/sw.ts) enfoca esa ventana y le pide
 * abrir la pantalla del aviso: se navega sin recargar (spec 013, R16). Sólo rutas propias del panel o
 * de /admin. Se carga al arrancar (main.tsx).
 */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    const message = event.data as { type?: unknown; url?: unknown } | null;
    if (message?.type === "agenda360:abrir" && isPanelPath(message.url)) void router.navigate(message.url);
  });
  // Los mensajes que llegaron antes de este punto se entregan ahora.
  navigator.serviceWorker.startMessages();
}
