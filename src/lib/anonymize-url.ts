/**
 * Direcciones sin datos de nadie, para lo que sale de la web hacia otros servicios.
 *
 * - La analítica (Vercel Analytics y Speed Insights): los identificadores de la ruta (clientes, negocios,
 *   formatos) se cambian por "[id]", los tokens de los enlaces privados por "[token]" y se quitan los
 *   parámetros. "/dashboard/clients/0b6e…?tab=historia" → "/dashboard/clients/[id]"; "/pago/9f3c…" →
 *   "/pago/[token]".
 * - Los avisos de errores a Sentry (spec 044) limpian más: ver error-report-rules.ts.
 */

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
/** Tokens de los enlaces privados (el de pago, /pago/<32 hex>): quien los tiene entra sin sesión. */
const TOKEN = /\b[0-9a-f]{16,}\b/gi;

/** La página para la analítica (ver arriba). */
export const anonymizePath = (pathname: string) => pathname.replace(UUID, "[id]").replace(TOKEN, "[token]");

/** La dirección entera para la analítica: la página limpia, sin parámetros ni `#`. */
export function anonymizeUrl(value: string): string {
  const url = new URL(value);
  url.pathname = anonymizePath(url.pathname);
  url.search = "";
  url.hash = "";
  return url.toString();
}
