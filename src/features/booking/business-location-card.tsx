import { Navigation } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionsUrl, getEmbeddedMapUrl, hasMapPoint } from "@/lib/maps";
import type { PublicBusiness } from "@/types";

// El mapa (MapLibre, unos 450 KB) sólo se descarga si el negocio marcó su ubicación y el paciente
// baja hasta él: en el celular, quien sólo reserva no lo paga en datos ni en tiempo.
const LocationMap = lazy(() => import("@/components/shared/location-map"));

/** true cuando el elemento está a menos de `margin` de la pantalla (y desde entonces, siempre). */
function useNearViewport(margin = "300px") {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const element = ref.current;
    if (near || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, margin]);
  return { ref, near };
}

/**
 * Ubicación del local en la página de reservas: el punto exacto en nuestro mapa y "Cómo llegar". Si el negocio
 * no marcó su punto pero escribió su dirección, el mapa de Google con esa dirección (2026-11-11). Los dos se cargan
 * sólo cuando el paciente baja hasta ellos.
 */
export function BusinessLocationCard({ business }: { business: PublicBusiness }) {
  const { ref, near } = useNearViewport();
  const point = hasMapPoint(business);
  const address = business.address.trim();
  if (!point && !address) return null;
  const placeholder = <Skeleton className={point ? "h-40 rounded-none" : "h-52 rounded-none"} />;
  return (
    <section aria-labelledby="business-location-heading" className="space-y-3">
      <div ref={ref} className="overflow-hidden rounded-xl border">
        {!near ? (
          placeholder
        ) : point ? (
          <Suspense fallback={placeholder}>
            <LocationMap point={{ lat: business.lat!, lng: business.lng! }} label={`Ubicación de ${business.name} en el mapa`} className="h-40" />
          </Suspense>
        ) : (
          <iframe
            src={getEmbeddedMapUrl(address)}
            title={`Mapa de Google con la dirección de ${business.name}`}
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            className="block h-52 w-full border-0 bg-muted"
          />
        )}
      </div>
      <div className="px-1">
        <h2 id="business-location-heading" className="font-bold">
          Cómo llegar
        </h2>
        {business.address && <p className="text-sm text-muted-foreground">{business.address}</p>}
      </div>
      <Button asChild variant="outline" className="h-10 w-full">
        <a href={getDirectionsUrl(business)} target="_blank" rel="noreferrer">
          <Navigation /> Abrir en Google Maps
        </a>
      </Button>
    </section>
  );
}
