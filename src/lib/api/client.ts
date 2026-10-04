import { DataError, type DataErrorCode } from "@/lib/data/errors";

/**
 * Cliente HTTP de la API (agenda-backend).
 *
 * En desarrollo, Vite redirige `/api` al backend (ver vite.config.ts), así que el
 * navegador habla con un único origen y la cookie de sesión funciona sin CORS.
 * En producción, VITE_API_URL puede apuntar a otro dominio.
 */
const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/+$/, "");

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  body?: unknown;
  query?: Record<string, QueryValue>;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return `${API_URL}${path}${search ? `?${search}` : ""}`;
}

/** Hace la petición y devuelve el JSON. Los errores llegan como DataError con mensaje para el usuario. */
export async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        // Protección CSRF: la API rechaza las escrituras sin esta cabecera.
        "X-Requested-With": "fetch",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new DataError("network", "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = (payload as { error?: { code?: DataErrorCode; message?: string } } | undefined)?.error;
    // Sin respuesta de la API (p. ej. está apagada y responde el proxy): no es un error de la operación.
    if (!error && response.status >= 500) {
      throw new DataError("network", "No se pudo conectar con el servidor. Inténtalo de nuevo en unos minutos.");
    }
    throw new DataError(
      error?.code ?? "server",
      error?.message ?? "Ocurrió un error inesperado. Inténtalo de nuevo.",
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>) => apiRequest<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>("POST", path, { body: body ?? {} }),
  put: <T>(path: string, body: unknown) => apiRequest<T>("PUT", path, { body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>("PATCH", path, { body }),
  delete: <T = void>(path: string) => apiRequest<T>("DELETE", path),
};
