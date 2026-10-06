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

/** Recuadro de unos 30 km alrededor de un punto: da prioridad a lo cercano sin excluir lo demás. */
function viewboxAround({ lat, lng }: GeoPoint): Record<string, string> {
  const d = 0.15;
  return { viewbox: [lng - d, lat + d, lng + d, lat - d].map((n) => n.toFixed(5)).join(",") };
}

export async function searchAddress(
  query: string,
  countryCode?: string,
  signal?: AbortSignal,
  /** Prioriza los resultados cerca de este punto (p. ej. lo que muestra el mapa). */
  near?: GeoPoint,
  /** Con `near`: sólo resultados de esa zona. */
  onlyNear = false,
): Promise<GeocodeResult[]> {
  const places = await request<NominatimPlace[]>(
    "search",
    {
      q: query,
      limit: "8",
      ...(countryCode ? { countrycodes: countryCode } : {}),
      ...(near ? viewboxAround(near) : {}),
      ...(near && onlyNear ? { bounded: "1" } : {}),
    },
    signal,
  );
  // Una calle larga llega en varios tramos con el mismo nombre: se muestra una vez.
  const seen = new Set<string>();
  return places
    .map((place) => ({
      lat: Number(place.lat),
      lng: Number(place.lon),
      label: shortLabel(place),
      isArea: place.category === "boundary",
    }))
    .filter((result) => !seen.has(result.label) && seen.add(result.label))
    .slice(0, 5);
}

/**
 * Como searchAddress, pero tolera una parte mal escrita: si "Av. 10 de Agosto, Cotacahi" no da nada,
 * busca "Av. 10 de Agosto" en la zona de `near` (sin ella saldrían calles con ese nombre de todo el
 * país). `skipped` es la parte que se dejó fuera (null si no hizo falta).
 */
export async function searchAddressLeniently(
  query: string,
  countryCode?: string,
  near?: GeoPoint,
): Promise<{ results: GeocodeResult[]; skipped: string | null }> {
  const results = await searchAddress(query, countryCode, undefined, near);
  const parts = query.split(",").map((part) => part.trim()).filter(Boolean);
  if (results.length > 0 || parts.length < 2 || !near) return { results, skipped: null };
  // El servidor público de Nominatim admite una petición por segundo.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const relaxed = await searchAddress(parts.slice(0, -1).join(", "), countryCode, undefined, near, true);
  return { results: relaxed, skipped: relaxed.length > 0 ? parts.at(-1)! : null };
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
