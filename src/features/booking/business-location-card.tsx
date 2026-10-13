import { Navigation } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionsUrl, hasMapPoint } from "@/lib/maps";
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

/** Ubicación del local en la página de reservas: el punto exacto en el mapa y "Cómo llegar". */
export function BusinessLocationCard({ business }: { business: PublicBusiness }) {
  const { ref, near } = useNearViewport();
  if (!hasMapPoint(business)) return null;
  const placeholder = <Skeleton className="h-40 rounded-none" />;
  return (
    <section aria-labelledby="business-location-heading" className="space-y-3">
      <div ref={ref} className="overflow-hidden rounded-xl border">
        {near ? (
          <Suspense fallback={placeholder}>
            <LocationMap point={{ lat: business.lat!, lng: business.lng! }} label={`Ubicación de ${business.name} en el mapa`} className="h-40" />
          </Suspense>
        ) : (
          placeholder
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
