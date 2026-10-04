import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { GeoPoint } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { BASE_MAP_OPTIONS, canShowMap, collapseAttribution, createPinElement } from "./map-base";

/**
 * Mapa de sólo lectura con un punto (p. ej. el local del negocio en la página de reservas).
 * Es una vista fija: para moverse está el botón "Cómo llegar". Se carga bajo demanda (React.lazy).
 */
export default function LocationMap({ point, label, className }: { point: GeoPoint; label: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sin WebGL queda el fondo gris; la dirección y "Cómo llegar" siguen visibles.
    if (!canShowMap()) return;
    const map = new maplibregl.Map({
      ...BASE_MAP_OPTIONS,
      container: containerRef.current!,
      center: [point.lng, point.lat],
      zoom: 15.5,
      interactive: false,
    });
    collapseAttribution(map);
    new maplibregl.Marker({ element: createPinElement(), anchor: "bottom" }).setLngLat([point.lng, point.lat]).addTo(map);
    return () => map.remove();
  }, [point.lat, point.lng]);

  // `isolate`: los controles del mapa no tapan diálogos ni menús de la página.
  return <div ref={containerRef} role="group" aria-label={label} className={cn("isolate bg-muted", className)} />;
}
