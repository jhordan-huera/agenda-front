import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
/** Tokens de los enlaces privados (el de pago, /pago/<32 hex>): quien los tiene entra sin sesión. */
const TOKEN = /\b[0-9a-f]{16,}\b/gi;

/** Sólo en la web publicada: ni en desarrollo ni en `npm run preview`. */
const enabled = import.meta.env.PROD && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

/**
 * A Vercel sólo llega la página, sin datos de nadie: los identificadores de la ruta (clientes,
 * negocios, formatos) se cambian por "[id]", los tokens de los enlaces privados por "[token]" y se
 * quitan los parámetros de la URL.
 * "/dashboard/clients/0b6e…?tab=historia" → "/dashboard/clients/[id]"; "/pago/9f3c…" → "/pago/[token]".
 */
const anonymizePath = (pathname: string) => pathname.replace(UUID, "[id]").replace(TOKEN, "[token]");

function anonymizeUrl(value: string): string {
  const url = new URL(value);
  url.pathname = anonymizePath(url.pathname);
  url.search = "";
  url.hash = "";
  return url.toString();
}

const anonymize = (event: BeforeSendEvent): BeforeSendEvent => ({ ...event, url: anonymizeUrl(event.url) });

/**
 * Visitas por página con Vercel Web Analytics y velocidad real de la web (Core Web Vitals) con Speed
 * Insights: sin cookies y con las mismas URLs sin datos de nadie.
 */
export function PageAnalytics() {
  if (!enabled) return null;
  return (
    <>
      <Analytics mode="production" beforeSend={anonymize} />
      <SpeedInsights
        beforeSend={(event) => ({ ...event, url: anonymizeUrl(event.url), route: event.route && anonymizePath(event.route) })}
      />
    </>
  );
}
