/**
 * Service worker de Agenda360: lo que permite instalar el panel como aplicación y abrirlo rápido.
 *
 * Guarda en el dispositivo la app de cada versión publicada (HTML, JS, CSS, iconos y la letra).
 * Los datos NO pasan por aquí: citas, clientes e historias clínicas se piden siempre a la API y no
 * quedan guardados en el teléfono. Sin conexión, la app abre y avisa de que no hay internet.
 *
 * Sólo lo registran el panel, el login y el panel de plataforma (src/lib/installable-app.ts): la
 * portada y la página de reservas de los clientes no descargan nada de esto.
 *
 * También muestra los avisos en el celular (spec 013): los recibe cifrados del servicio de avisos del
 * navegador y, al tocarlos, abre la pantalla que corresponde (sólo del panel o de /admin).
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

/* ------------------------------------------- Avisos en el celular (spec 013) -- */

/** Lo que manda la API (cifrado: el servicio de avisos no lo puede leer). */
interface PushPayload {
  title?: unknown;
  body?: unknown;
  url?: unknown;
  tag?: unknown;
}

/** Sólo rutas propias que empiezan por /dashboard o /admin; cualquier otra cosa abre el panel. */
function panelUrl(value: unknown): string {
  if (typeof value === "string" && /^\/(dashboard|admin)(?=$|[/?#])/.test(value) && !/[\s\\]/.test(value)) {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin) return `${url.pathname}${url.search}`;
  }
  return "/dashboard";
}

// Siempre muestra algo: Safari y Chrome dan de baja a los sitios que reciben avisos sin mostrarlos.
self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = (event.data?.json() as PushPayload | undefined) ?? {};
  } catch {
    payload = {};
  }
  const readable = typeof payload.title === "string" && payload.title !== "";
  event.waitUntil(
    self.registration.showNotification(readable ? (payload.title as string) : "Agenda360", {
      body: readable ? (typeof payload.body === "string" ? payload.body : "") : "Tienes un aviso nuevo",
      icon: "/icon-app-192.png",
      badge: "/icon-badge-96.png",
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
      data: { url: panelUrl(payload.url) },
      lang: "es",
    }),
  );
});

// Al tocarlo: si la app ya está abierta, la enfoca y le pide abrir la pantalla (navega sin recargar,
// src/features/push/notification-navigation.ts); si no, abre una ventana nueva (en el iPhone, la app).
// Si la sesión caducó, el panel lleva al inicio de sesión y después a esa pantalla.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = panelUrl((event.notification.data as { url?: unknown } | null)?.url);
  event.waitUntil(
    (async () => {
      const windows = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).filter(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      const open = windows.find((client) => client.focused) ?? windows[0];
      if (open) {
        await open.focus().catch(() => undefined);
        open.postMessage({ type: "agenda360:abrir", url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

/** El evento de Firefox cuando el servicio de avisos renueva la dirección (no está en los tipos de TypeScript). */
interface PushSubscriptionChangeEvent extends ExtendableEvent {
  readonly oldSubscription: PushSubscription | null;
  readonly newSubscription: PushSubscription | null;
}

// Se vuelve a suscribir con la misma clave y se lo dice a la API (con la cookie de la sesión). Si falla
// (p. ej. sin sesión), lo arregla la sincronización al abrir el panel.
self.addEventListener("pushsubscriptionchange", (event) => {
  const change = event as PushSubscriptionChangeEvent;
  change.waitUntil(
    (async () => {
      const previous = change.oldSubscription;
      const key = previous?.options.applicationServerKey;
      const next =
        change.newSubscription ?? (key ? await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : null);
      if (!next) return;
      const { keys } = next.toJSON();
      await fetch("/api/push/device", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify({ endpoint: next.endpoint, keys, ...(previous ? { previousEndpoint: previous.endpoint } : {}) }),
      });
    })().catch(() => undefined),
  );
});
