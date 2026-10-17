import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useEffectEvent, useRef } from "react";
import type { GeoPoint } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { BASE_MAP_OPTIONS, canShowMap, collapseAttribution, createMap, createPinElement, MAP_CONTAINER_CLASS, useMapTheme } from "./map-base";

/**
 * Mapa de sólo lectura con un punto (p. ej. el local del negocio en la página de reservas).
 * Es una vista fija: para moverse está el botón "Cómo llegar". Se carga bajo demanda (React.lazy).
 * Sigue al modo de pantalla (spec 019): al cambiar, cambia el estilo y el pin se queda.
 */
export default function LocationMap({ point, label, className }: { point: GeoPoint; label: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const theme = useMapTheme(mapRef);
  // El modo al crear el mapa; después lo cambia useMapTheme, sin rehacerlo.
  const currentTheme = useEffectEvent(() => theme);

  useEffect(() => {
    // Sin WebGL queda el fondo gris; la dirección y "Cómo llegar" siguen visibles.
    if (!canShowMap()) return;
    const map = createMap(
      {
        ...BASE_MAP_OPTIONS,
        container: containerRef.current!,
        center: [point.lng, point.lat],
        zoom: 15.5,
        interactive: false,
      },
      currentTheme(),
    );
    collapseAttribution(map);
    new maplibregl.Marker({ element: createPinElement(), anchor: "bottom" }).setLngLat([point.lng, point.lat]).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [point.lat, point.lng]);

  // `isolate`: los controles del mapa no tapan diálogos ni menús de la página.
  return <div ref={containerRef} role="group" aria-label={label} className={cn("isolate bg-muted", MAP_CONTAINER_CLASS, className)} />;
}
