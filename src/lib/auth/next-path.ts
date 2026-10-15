import type { Session } from "./types";

/**
 * Volver a la pantalla de un aviso al iniciar sesión (spec 013, R18): `/login?next=…`. Sólo rutas
 * propias del panel ("/dashboard…") o de /admin, nunca otra web: así el enlace no sirve para mandar a
 * nadie fuera. La analítica no ve `next` (page-analytics.tsx quita los parámetros).
 */

/** "/dashboard…" o "/admin…", sin "//", "\" ni espacios, y que se quede en este sitio. */
export function isPanelPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000 || /[\s\\]/.test(value)) return false;
  if (!/^\/(dashboard|admin)(?=$|[/?#])/.test(value)) return false;
  try {
    return new URL(value, "https://agenda360.invalid").origin === "https://agenda360.invalid";
  } catch {
    return false;
  }
}

/** Adónde ir al entrar: `next` si es una ruta del panel de esa cuenta; si no, null (y se va al Inicio). */
export function safeNextPath(value: unknown, session: Session): string | null {
  if (!isPanelPath(value)) return null;
  if (session.platformRole === "super_admin") return value.startsWith("/admin") ? value : null;
  return session.businessId && value.startsWith("/dashboard") ? value : null;
}

/** El inicio de sesión que vuelve a esta pantalla ("/login" a secas desde el Inicio). */
export function loginPathFor(pathname: string, search: string): string {
  const path = `${pathname}${search}`;
  return path === "/dashboard" || path === "/admin" || !isPanelPath(path) ? "/login" : `/login?next=${encodeURIComponent(path)}`;
}
