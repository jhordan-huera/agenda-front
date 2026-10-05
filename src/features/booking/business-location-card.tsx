import { Navigation } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionsUrl, hasMapPoint } from "@/lib/maps";
import type { PublicBusiness } from "@/types";

// El mapa (Leaflet) sólo se descarga si el negocio marcó su ubicación.
const LocationMap = lazy(() => import("@/components/shared/location-map"));

/** Ubicación del local en la página de reservas: el punto exacto en el mapa y "Cómo llegar". */
export function BusinessLocationCard({ business }: { business: PublicBusiness }) {
  if (!hasMapPoint(business)) return null;
  return (
    <section aria-labelledby="business-location-heading" className="space-y-3">
      <div className="overflow-hidden rounded-xl border">
        <Suspense fallback={<Skeleton className="h-40 rounded-none" />}>
          <LocationMap point={{ lat: business.lat!, lng: business.lng! }} label={`Ubicación de ${business.name} en el mapa`} className="h-40" />
        </Suspense>
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
