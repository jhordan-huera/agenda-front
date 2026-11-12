import { captureException, dedupeIntegration, init, linkedErrorsIntegration, withScope, type ErrorEvent } from "@sentry/browser";
import { errorApiPath, errorPagePath, scrubMessage, userTypeFor } from "@/lib/error-report-rules";
import type { PendingReport, RawTrailItem } from "@/lib/error-reports";

/**
 * La librería de Sentry (spec 044). Se descarga aparte, sólo con el primer error (ver error-reports.ts).
 *
 * Sin las integraciones por defecto: ni migas automáticas (clics, consola, peticiones), ni grabación de
 * pantalla, ni medición de rendimiento. Sólo `dedupe` y `linkedErrors` (la causa de un error). Todo se limpia
 * aquí antes de enviarlo (error-report-rules.ts): la página, las rutas, los mensajes y lo último que pasó.
 */

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/** Un número al azar por visita (se pierde al cerrar la pestaña): Sentry cuenta así las visitas afectadas. */
function visitId(): string | undefined {
  try {
    const KEY = "agenda360:visita";
    const id = sessionStorage.getItem(KEY) ?? crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return undefined;
  }
}

/** Lo último antes del error, limpio: las páginas y los pedidos («GET /businesses/[id]/clients → 500»). */
function cleanTrail(item: RawTrailItem): { category: string; message: string; timestamp: number } {
  const timestamp = item.at / 1000;
  if (item.kind === "page") return { category: "navigation", message: errorPagePath(item.text), timestamp };
  const [method, path, ...status] = item.text.split(" ");
  return { category: "fetch", message: `${method} ${errorApiPath(path)} → ${status.join(" ")}`, timestamp };
}

function clean(event: ErrorEvent, visit: string | undefined): ErrorEvent {
  event.request = {
    url: `${window.location.origin}${errorPagePath(window.location.pathname)}`,
    headers: { "User-Agent": navigator.userAgent },
  };
  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = scrubMessage(value.value);
  }
  if (event.message) event.message = scrubMessage(event.message);
  event.user = visit ? { id: visit } : undefined;
  delete event.extra;
  delete event.server_name;
  return event;
}

/** Inicia Sentry y devuelve con qué avisar. */
export function startSentry(dsn: string) {
  const visit = visitId();
  init({
    dsn,
    release: import.meta.env.VITE_RELEASE || undefined,
    environment: LOCAL_HOST.test(window.location.hostname) ? "pruebas" : "production",
    defaultIntegrations: false,
    integrations: [dedupeIntegration(), linkedErrorsIntegration()],
    // Sentry 11 recoge todo por defecto: aquí, nada (principio II). Igual `clean` arma la petición de nuevo.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    sendClientReports: false,
    beforeSend: (event) => clean(event, visit),
  });
  return (report: PendingReport) =>
    withScope((scope) => {
      const { pathname, context } = report;
      scope.setTags({
        pagina: errorPagePath(pathname),
        usuario: userTypeFor(pathname, context),
        ...(context.businessId && pathname.startsWith("/dashboard") ? { negocio: context.businessId } : {}),
      });
      for (const item of report.trail) scope.addBreadcrumb(cleanTrail(item));
      if (report.server) {
        const { method, path, status } = report.server;
        const route = `${method} ${errorApiPath(path)}`;
        scope.setTags({ ruta: route, estado: String(status) });
        scope.setFingerprint(["fallo-del-servidor", route, String(status)]);
        const error = new Error(`El servidor respondió ${status} sin pasar por la API en ${route}`);
        error.name = "FalloDelServidor";
        captureException(error);
      } else {
        captureException(report.error instanceof Error ? report.error : new Error(String(report.error)));
      }
    });
}
