import { DataError } from "@/lib/data/errors";
import { isStaleAssetError } from "@/lib/new-version";

/**
 * Avisos de errores de la web a Sentry (spec 044): las pantallas que se rompen, los errores sin atrapar y los
 * fallos del servidor que la API no pudo avisar (un 5xx sin su cuerpo de error).
 *
 * Esto va en el arranque y es lo mínimo: decide qué se avisa, recuerda las últimas páginas y pedidos (sólo en
 * memoria) y guarda los errores en una cola. Con el primer error se descarga sentry-client.ts, con la librería
 * de Sentry y las reglas que limpian todo (error-report-rules.ts) antes de enviarlo: nada de los pacientes
 * sale de la web. Sólo con VITE_SENTRY_DSN, fuera de este equipo (o con un DSN de este equipo: el Sentry de
 * prueba del recorrido).
 */

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const MAX_PER_VISIT = 5;
const TRAIL_SIZE = 10;

/** ¿Se envían avisos? Con un DSN y fuera de este equipo, salvo que el DSN también sea de este equipo. */
export function isReportingEnabled(dsn: string | undefined, pageHost: string): boolean {
  if (!dsn) return false;
  try {
    const target = new URL(dsn);
    if (!target.username || !/^https?:$/.test(target.protocol)) return false;
    return !LOCAL_HOST.test(pageHost) || LOCAL_HOST.test(target.hostname);
  } catch {
    return false;
  }
}

const DSN: string | undefined = import.meta.env?.VITE_SENTRY_DSN || undefined;
const enabled = typeof window !== "undefined" && isReportingEnabled(DSN, window.location.hostname);

/**
 * ¿Es un error para avisar? No lo son los de la API (DataError: los previstos llevan su mensaje y los de
 * conexión no son un fallo de la app), la versión vieja que se recarga sola, una petición cortada, la falta
 * de conexión ni lo que sale de una extensión del navegador.
 */
export function shouldReport(error: unknown): boolean {
  if (error instanceof DataError || isStaleAssetError(error)) return false;
  if (!(error instanceof Error)) return typeof error === "string" && error.trim().length > 0;
  return !(
    error.name === "AbortError" ||
    /^(?:failed to fetch|load failed|networkerror when attempting to fetch resource\.?|network request failed)$/i.test(error.message.trim()) ||
    /ResizeObserver loop/i.test(error.message) ||
    /(?:chrome|moz|safari(?:-web)?|webkit-masked)-extension:\/\//.test(error.stack ?? "")
  );
}

export interface ErrorContext {
  /** El negocio del panel (o el del modo soporte): sólo su identificador interno. */
  businessId: string | null;
  superAdmin: boolean;
  signedIn: boolean;
}

let context: ErrorContext = { businessId: null, superAdmin: false, signedIn: false };

/** Lo pone el proveedor de la sesión cada vez que cambia. */
export function setErrorContext(next: ErrorContext): void {
  context = next;
}

/** Lo último antes del error, tal cual y sólo en memoria: se limpia en sentry-client.ts antes de enviarlo. */
export interface RawTrailItem {
  kind: "page" | "api";
  /** La página, o «MÉTODO ruta estado». */
  text: string;
  at: number;
}

const trail: RawTrailItem[] = [];
const remember = (item: RawTrailItem) => {
  trail.push(item);
  if (trail.length > TRAIL_SIZE * 2) trail.shift();
};

export function recordPage(pathname: string): void {
  if (enabled) remember({ kind: "page", text: pathname, at: Date.now() });
}

export function recordApiCall(method: string, path: string, status: number | "sin conexión"): void {
  if (enabled) remember({ kind: "api", text: `${method} ${path.split("?")[0]} ${status}`, at: Date.now() });
}

/** Lo que se le pasa a sentry-client.ts: el error (o el fallo del servidor) con el contexto de ese momento. */
export interface PendingReport {
  error?: unknown;
  server?: { method: string; path: string; status: number };
  pathname: string;
  context: ErrorContext;
  trail: RawTrailItem[];
}

const seen = new Set<string>();
let sentThisVisit = 0;
const queue: PendingReport[] = [];
let capture: ((report: PendingReport) => void) | null = null;
let loading: Promise<void> | null = null;

function send(key: string, report: Omit<PendingReport, "pathname" | "context" | "trail">): void {
  if (seen.has(key) || sentThisVisit >= MAX_PER_VISIT) return;
  seen.add(key);
  sentThisVisit++;
  const pending = { ...report, pathname: window.location.pathname, context, trail: trail.slice() };
  if (capture) return capture(pending);
  queue.push(pending);
  loading ??= import("./sentry-client")
    .then((client) => {
      capture = client.startSentry(DSN!);
      for (const item of queue.splice(0)) capture(item);
    })
    .catch(() => {
      // Sin conexión no llega la librería: esos avisos se pierden sin molestar a nadie.
      queue.length = 0;
      loading = null;
    });
}

/** Avisa de un error de la web (una pantalla rota o un error sin atrapar), si es de los que se avisan. */
export function reportError(error: unknown): void {
  if (!enabled || !shouldReport(error)) return;
  send(error instanceof Error ? `${error.name}|${error.message}` : String(error), { error });
}

/** Un 5xx sin el cuerpo de error de la API: no llegó a la API, o la API no respondió (spec 044, historia 2). */
export function reportServerFailure(method: string, path: string, status: number): void {
  if (enabled) send(`${method} ${path.split("?")[0]} ${status}`, { server: { method, path, status } });
}

/** Los errores sin atrapar de toda la web. Se llama una vez al arrancar (main.tsx). */
export function installGlobalErrorHandlers(): void {
  if (!enabled) return;
  // Sin `event.error` es un «Script error.» de otro origen, sin nada útil.
  window.addEventListener("error", (event) => event.error && reportError(event.error));
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));
}
