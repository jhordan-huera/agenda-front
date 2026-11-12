import { Analytics, type BeforeSendEvent } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { anonymizePath, anonymizeUrl } from "@/lib/anonymize-url";

/** Sólo en la web publicada: ni en desarrollo ni en `npm run preview`. */
const enabled = import.meta.env.PROD && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

/** A Vercel sólo llega la página, sin datos de nadie (ver anonymize-url.ts). */
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
