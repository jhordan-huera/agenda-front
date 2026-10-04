import { Navigation } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDirectionsUrl, hasMapPoint } from "@/lib/maps";
import type { Business } from "@/types";

// El mapa (Leaflet) sólo se descarga si el negocio marcó su ubicación.
const LocationMap = lazy(() => import("@/components/shared/location-map"));

/** Ubicación del local en la página de reservas: el punto exacto en el mapa y "Cómo llegar". */
export function BusinessLocationCard({ business }: { business: Business }) {
  if (!hasMapPoint(business)) return null;
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Suspense fallback={<Skeleton className="h-44 rounded-none" />}>
        <LocationMap
          point={{ lat: business.lat!, lng: business.lng! }}
          label={`Ubicación de ${business.name} en el mapa`}
          className="h-44 border-b"
        />
      </Suspense>
      <div className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Cómo llegar</h2>
          {business.address && <p className="mt-1 text-sm text-muted-foreground">{business.address}</p>}
        </div>
        <Button asChild variant="outline" className="w-full">
          <a href={getDirectionsUrl(business)} target="_blank" rel="noreferrer">
            <Navigation /> Abrir en Google Maps
          </a>
        </Button>
      </div>
    </div>
  );
}
