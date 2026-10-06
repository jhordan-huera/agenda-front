import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Sólo en la web publicada: ni en desarrollo ni en `npm run preview`. */
const enabled = import.meta.env.PROD && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

/**
 * A Vercel sólo llega la página, sin datos de nadie: los identificadores de la ruta (clientes,
 * negocios, formatos) se cambian por "[id]" y se quitan los parámetros de la URL.
 * "/dashboard/clients/0b6e…?tab=historia" → "/dashboard/clients/[id]".
 */
function anonymize(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  url.pathname = url.pathname.replace(UUID, "[id]");
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

/** Visitas por página con Vercel Web Analytics (sin cookies). */
export function PageAnalytics() {
  return enabled ? <Analytics mode="production" beforeSend={anonymize} /> : null;
}
