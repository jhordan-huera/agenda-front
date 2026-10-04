/**
 * Búsqueda de direcciones con Nominatim (OpenStreetMap): gratis y sin clave, pero el
 * servidor público admite poco tráfico (1 petición por segundo). En producción se
 * cambia por un proveedor (LocationIQ, MapTiler, Google Geocoding) sin tocar la interfaz.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends GeoPoint {
  label: string;
  /** Límite administrativo (cantón, provincia): su punto es el centro de una zona grande. */
  isArea: boolean;
}

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  category?: string;
  address?: Record<string, string | undefined>;
}

/** "Av. Amazonas N34-120, La Carolina, Quito" a partir de las partes de la dirección. */
function shortLabel(place: NominatimPlace): string {
  const a = place.address ?? {};
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const parts = [street, a.neighbourhood ?? a.suburb, a.city ?? a.town ?? a.village].filter(Boolean);
  return parts.length >= 2 ? parts.join(", ") : place.display_name;
}

async function request<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams({ format: "jsonv2", addressdetails: "1", "accept-language": "es", ...params });
  const response = await fetch(`${NOMINATIM_URL}/${path}?${query}`, { signal });
  if (!response.ok) throw new Error(`Geocoding ${response.status}`);
  return (await response.json()) as T;
}

export async function searchAddress(query: string, countryCode?: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const places = await request<NominatimPlace[]>(
    "search",
    { q: query, limit: "5", ...(countryCode ? { countrycodes: countryCode } : {}) },
    signal,
  );
  return places.map((place) => ({
    lat: Number(place.lat),
    lng: Number(place.lon),
    label: shortLabel(place),
    isArea: place.category === "boundary",
  }));
}

/** Dirección aproximada de un punto del mapa (para rellenar el campo de dirección). */
export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<string | null> {
  const place = await request<NominatimPlace | { error: string }>(
    "reverse",
    { lat: String(point.lat), lon: String(point.lng), zoom: "18" },
    signal,
  );
  return "display_name" in place ? shortLabel(place) : null;
}
