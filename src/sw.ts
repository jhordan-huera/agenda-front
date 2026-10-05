/**
 * Service worker de Agenda360: lo que permite instalar el panel como aplicación y abrirlo rápido.
 *
 * Guarda en el dispositivo la app de cada versión publicada (HTML, JS, CSS, iconos y la letra).
 * Los datos NO pasan por aquí: citas, clientes e historias clínicas se piden siempre a la API y no
 * quedan guardados en el teléfono. Sin conexión, la app abre y avisa de que no hay internet.
 *
 * Sólo lo registran el panel, el login y el panel de plataforma (src/lib/installable-app.ts): la
 * portada y la página de reservas de los clientes no descargan nada de esto.
 */
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute, type PrecacheEntry } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> };

/** Cuánto se espera a la red al abrir la app antes de usar la copia guardada. */
const NETWORK_TIMEOUT_MS = 4000;

// Una versión nueva toma el control en cuanto se instala, sin esperar a cerrar las pestañas.
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
// directoryIndex vacío: abrir "/" no sale de la copia guardada, va a la red como el resto de páginas.
precacheAndRoute(self.__WB_MANIFEST, { directoryIndex: "" });

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("La red no respondió a tiempo")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/**
 * Abrir cualquier página va SIEMPRE primero a la red, para cargar la versión recién publicada.
 * Sólo si no hay red, o no responde en 4 s, se usa el index.html guardado: es el de la misma
 * versión que los JS y CSS guardados con él, así nunca pide archivos que ya no existen.
 * /api queda fuera: son datos (y descargas de archivos), nunca la app.
 */
registerRoute(
  new NavigationRoute(
    async ({ request }) => {
      try {
        return await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
      } catch {
        return (await matchPrecache("index.html")) ?? Response.error();
      }
    },
    { denylist: [/^\/api\//] },
  ),
);
