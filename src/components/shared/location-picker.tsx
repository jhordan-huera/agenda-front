import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { CheckCircle2, Loader2, LocateFixed, MapPin, Minus, Plus, Search } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reverseGeocode, searchAddress, searchAddressLeniently, type GeocodeResult, type GeoPoint } from "@/lib/geocoding";
import { cn } from "@/lib/utils";
import { BASE_MAP_OPTIONS, canShowMap, collapseAttribution, createPinElement } from "./map-base";

/**
 * Selector de ubicación exacta: el usuario toca el mapa, arrastra el pin, usa su GPS
 * o busca una dirección. Mapa vectorial (MapLibre + OpenFreeMap, gratis y sin clave de API).
 * Se carga bajo demanda (React.lazy) para no sumar el peso del mapa a toda la app.
 */

export interface LocationPickerProps {
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  /** Dirección aproximada del punto elegido, para rellenar el campo de dirección. */
  onAddressSuggestion?: (address: string) => void;
  /** Centro inicial si aún no hay punto (ciudad principal del país del negocio). */
  defaultCenter: [lat: number, lng: number];
  /** Dirección en la que centrar el mapa al abrirlo (p. ej. la del negocio). */
  centerOnAddress?: string;
  /** Limita la búsqueda de direcciones a un país (código ISO, "ec"). */
  countryCode?: string;
  invalid?: boolean;
  describedBy?: string;
}

const PICKED_ZOOM = 17;

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Botón flotante sobre el mapa. */
const MAP_BUTTON =
  "flex size-9 items-center justify-center text-foreground outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50";

export default function LocationPicker({
  value,
  onChange,
  onAddressSuggestion,
  defaultCenter,
  centerOnAddress,
  countryCode,
  invalid,
  describedBy,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // Sin WebGL no hay mapa, pero quedan el buscador y "Mi ubicación".
  const [mapSupported] = useState(canShowMap);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  // Parte de la búsqueda que no se encontró y se dejó fuera (p. ej. la ciudad mal escrita).
  const [skipped, setSkipped] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const reverseRequest = useRef<AbortController | null>(null);
  const initial = useRef({ value, center: defaultCenter });

  const flyTo = (point: GeoPoint, zoom: number) =>
    mapRef.current?.flyTo({ center: [point.lng, point.lat], zoom, duration: 700 });

  const pick = (point: GeoPoint, { fly = false } = {}) => {
    const rounded = { lat: round(point.lat), lng: round(point.lng) };
    onChange(rounded);
    if (fly) flyTo(rounded, PICKED_ZOOM);
    if (!onAddressSuggestion) return;
    reverseRequest.current?.abort();
    const controller = new AbortController();
    reverseRequest.current = controller;
    reverseGeocode(rounded, controller.signal)
      .then((address) => address && onAddressSuggestion(address))
      .catch(() => {}); // La dirección se puede escribir a mano.
  };
  const pickFromMap = useEffectEvent((point: GeoPoint) => pick(point));

  // El mapa se crea una sola vez; el pin y los movimientos se aplican después.
  useEffect(() => {
    if (!mapSupported) return;
    const { value: start, center } = initial.current;
    const map = new maplibregl.Map({
      ...BASE_MAP_OPTIONS,
      container: containerRef.current!,
      center: start ? [start.lng, start.lat] : [center[1], center[0]],
      zoom: start ? PICKED_ZOOM : 12,
      cooperativeGestures: true,
    });
    collapseAttribution(map);
    map.touchZoomRotate.disableRotation();
    map.on("click", (event) => pickFromMap({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [mapSupported]);

  // Pin arrastrable sincronizado con el valor.
  const lat = value?.lat ?? null;
  const lng = value?.lng ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lat === null || lng === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      return;
    }
    const marker = new maplibregl.Marker({ element: createPinElement(), anchor: "bottom", draggable: true })
      .setLngLat([lng, lat])
      .addTo(map);
    marker.getElement().style.cursor = "grab";
    marker.on("dragend", () => {
      const position = marker.getLngLat();
      pickFromMap({ lat: position.lat, lng: position.lng });
    });
    markerRef.current = marker;
  }, [lat, lng]);

  // Sin punto marcado, el mapa empieza en la zona del negocio (si su dirección se encuentra).
  useEffect(() => {
    if (initial.current.value || !centerOnAddress) return;
    const controller = new AbortController();
    searchAddress(centerOnAddress, countryCode, controller.signal)
      .then((found) => {
        // Mejor un lugar concreto (ciudad, calle) que el centro de un cantón entero.
        const best = found.find((result) => !result.isArea) ?? found[0];
        if (best) mapRef.current?.jumpTo({ center: [best.lng, best.lat], zoom: best.isArea ? 12 : 15 });
      })
      .catch(() => {}); // Si falla, se queda en la ciudad por defecto.
    return () => controller.abort();
  }, [centerOnAddress, countryCode]);

  useEffect(() => () => reverseRequest.current?.abort(), []);

  const runSearch = async () => {
    const text = query.trim();
    if (text.length < 3) return;
    setSearching(true);
    const center = mapRef.current?.getCenter();
    try {
      const found = await searchAddressLeniently(text, countryCode, center ? { lat: center.lat, lng: center.lng } : undefined);
      setResults(found.results);
      setSkipped(found.skipped);
    } catch {
      setResults([]);
      setSkipped(null);
      toast.error("No pudimos buscar la dirección. Marca el punto directamente en el mapa.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    // El buscador vive dentro de otro formulario: Enter busca y no lo envía.
    if (event.key === "Enter") {
      event.preventDefault();
      void runSearch();
    }
    if (event.key === "Escape" && results) {
      event.preventDefault();
      setResults(null);
    }
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Tu navegador no permite obtener la ubicación. Marca el punto en el mapa.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        pick({ lat: position.coords.latitude, lng: position.coords.longitude }, { fly: true });
      },
      () => {
        setLocating(false);
        toast.error("No pudimos obtener tu ubicación. Revisa los permisos o marca el punto en el mapa.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div
      className={cn(
        "relative isolate h-80 overflow-hidden rounded-2xl border bg-muted shadow-sm sm:h-96",
        invalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      {/* MapLibre fuerza `position: relative` en su contenedor: el que se posiciona es el envoltorio. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="size-full" />
      </div>
      {!mapSupported && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Tu navegador no puede mostrar el mapa. Busca la dirección o usa tu ubicación actual.
        </p>
      )}

      {/* Buscador flotante */}
      <div className="absolute inset-x-3 top-3 z-10">
        <div className="flex items-center gap-1 rounded-xl border bg-background/95 p-1 pl-3 shadow-lg backdrop-blur">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {/* 16 px en el móvil: con letra más pequeña, Safari de iOS hace zoom al enfocarlo. */}
          <input
            type="search"
            aria-label="Buscar dirección en el mapa"
            placeholder="Busca la calle, el barrio o un lugar cercano…"
            className="h-9 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          <Button type="button" size="sm" className="h-9 rounded-lg px-3" onClick={runSearch} disabled={searching}>
            {searching ? <Loader2 className="animate-spin" /> : "Buscar"}
          </Button>
        </div>
        {results && (
          <ul
            className="mt-2 max-h-52 divide-y overflow-auto rounded-xl border bg-background text-sm shadow-lg"
            aria-label="Resultados de la búsqueda"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-muted-foreground">
                Sin resultados. Revisa cómo está escrito (sobre todo la ciudad), prueba con otra referencia o marca el
                punto en el mapa.
              </li>
            ) : (
              <>
                {skipped && (
                  <li className="px-3 py-2 text-xs text-muted-foreground">
                    No encontramos «{skipped}»: te mostramos lo más parecido. Revisa cómo está escrito.
                  </li>
                )}
                {results.map((result) => (
                  <li key={`${result.lat},${result.lng}`}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                      onClick={() => {
                        setResults(null);
                        pick(result, { fly: true });
                      }}
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {result.label}
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
      </div>

      {/* Zoom y "Mi ubicación" (encima del botón de créditos del mapa) */}
      <div className="absolute right-3 bottom-11 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={cn(MAP_BUTTON, "w-auto gap-1.5 rounded-xl border bg-background px-3 text-sm font-medium shadow-lg")}
        >
          {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4 text-primary" />}
          Mi ubicación
        </button>
        {mapSupported && (
          <div className="flex flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
            <button type="button" aria-label="Acercar" className={MAP_BUTTON} onClick={() => mapRef.current?.zoomIn()}>
              <Plus className="size-4" />
            </button>
            <span className="h-px bg-border" aria-hidden />
            <button type="button" aria-label="Alejar" className={MAP_BUTTON} onClick={() => mapRef.current?.zoomOut()}>
              <Minus className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Estado */}
      <p
        id={describedBy}
        role="status"
        className={cn(
          "pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-8rem)] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-md",
          value ? "bg-emerald-600 text-white" : "bg-background/95 text-foreground",
        )}
      >
        {value ? (
          <>
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden /> Ubicación marcada · arrastra el pin para ajustarla
          </>
        ) : (
          <>
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden /> Toca el mapa en el lugar exacto
          </>
        )}
      </p>
    </div>
  );
}
