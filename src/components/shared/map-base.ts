import { Map as MapLibreMap, setWorkerUrl, type MapOptions } from "maplibre-gl";
import { useEffect, type RefObject } from "react";
// MapLibre busca su worker junto a su propio archivo, que Vite mueve al empaquetar: se le
// indica dónde quedó (Vite lo empaqueta con lo que importa y lo sirve desde /assets).
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { ResolvedTheme } from "@/features/theme/theme-mode";
import { useThemeMode } from "@/features/theme/use-theme-mode";

setWorkerUrl(workerUrl);

/**
 * Mapa base: estilos vectoriales de OpenFreeMap (datos de OpenStreetMap) dibujados con MapLibre.
 * Gratis, sin clave de API ni límite de visitas, y se puede usar en proyectos comerciales. Uno por
 * modo de pantalla (spec 019): "Liberty" en el claro y "Dark" en el oscuro.
 */
export const MAP_STYLE_URLS: Record<ResolvedTheme, string> = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/** Textos de los controles del mapa en español. */
const MAP_LOCALE: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Mostrar créditos del mapa",
  "AttributionControl.MapFeedback": "Comentarios sobre el mapa",
  "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda del ratón para hacer zoom",
  "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda del ratón para hacer zoom",
  "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
  "Map.Title": "Mapa",
  "Marker.Title": "Ubicación",
};

/**
 * Opciones comunes: mapa plano (sin girar ni inclinar) y créditos en un botón compacto. El estilo lo
 * pone createMap, según el modo de pantalla.
 */
export const BASE_MAP_OPTIONS = {
  locale: MAP_LOCALE,
  attributionControl: { compact: true },
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  maxPitch: 0,
} satisfies Partial<MapOptions>;

/**
 * Clases para el contenedor del mapa: en el oscuro, los créditos de MapLibre (su botón ⓘ, blanco en su
 * CSS) se invierten a oscuro, como el mapa (spec 019).
 */
export const MAP_CONTAINER_CLASS = "dark:[&_.maplibregl-ctrl-attrib]:invert dark:[&_.maplibregl-ctrl-attrib]:hue-rotate-180";

/**
 * El pin, del principal; su punto, del color del texto de los botones (blanco en el claro, oscuro en
 * el oscuro). El borde va blanco en los dos modos a propósito: separa el pin de cualquier mapa, claro
 * u oscuro (spec 019).
 */
const PIN_SVG = `<svg width="38" height="46" viewBox="0 0 36 44" aria-hidden="true" style="display:block;filter:drop-shadow(0 3px 4px rgba(15,23,42,.35))">
  <path d="M18 1C8.6 1 1 8.4 1 17.6 1 30 18 43 18 43s17-13 17-25.4C35 8.4 27.4 1 18 1Z" style="fill:var(--ink)" stroke="#fff" stroke-width="2"/>
  <circle cx="18" cy="17" r="6" style="fill:var(--primary-foreground)"/>
</svg>`;

/** Pin de la marca para `new Marker({ element, anchor: "bottom" })`: la punta marca el lugar. */
export function createPinElement(): HTMLElement {
  const element = document.createElement("div");
  element.innerHTML = PIN_SVG;
  return element;
}

/** El navegador puede dibujar el mapa (necesita WebGL). */
export function canShowMap(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * MapLibre abre los créditos del mapa al cargar y en un mapa pequeño tapan media vista.
 * Se pliegan en su botón ⓘ (siguen visibles y se despliegan al tocarlo).
 */
export function collapseAttribution(map: MapLibreMap) {
  const collapse = () =>
    map.getContainer().querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show");
  map.once("load", collapse);
  map.once("idle", collapse);
}

/** El modo con el que se dibuja cada mapa: para no volver a poner el mismo estilo. */
const mapThemes = new WeakMap<MapLibreMap, ResolvedTheme>();
/** Mapas esperando a que cargue el estilo oscuro: quitar la espera. */
const pendingDarkStyles = new WeakMap<MapLibreMap, () => void>();

/**
 * Si el estilo oscuro falla antes de cargar (el servidor no responde o lo cambió), el mapa se queda
 * con el claro: mejor un mapa claro que un recuadro vacío.
 */
function fallBackToLightStyle(map: MapLibreMap) {
  pendingDarkStyles.get(map)?.();
  const stop = () => {
    map.off("error", fallBack);
    map.off("style.load", stop);
    pendingDarkStyles.delete(map);
  };
  const fallBack = () => {
    stop();
    map.setStyle(MAP_STYLE_URLS.light, { diff: false });
  };
  map.on("error", fallBack);
  map.on("style.load", stop);
  pendingDarkStyles.set(map, stop);
}

/** Crea el mapa con el estilo del modo de pantalla (spec 019). */
export function createMap(options: Omit<MapOptions, "style">, theme: ResolvedTheme): MapLibreMap {
  const map = new MapLibreMap({ ...options, style: MAP_STYLE_URLS[theme] });
  mapThemes.set(map, theme);
  if (theme === "dark") fallBackToLightStyle(map);
  return map;
}

/**
 * Cambia el estilo del mapa al del modo, sin rehacerlo: la vista y los marcadores (de HTML) se
 * quedan. Sin `diff`, el estilo se carga entero: así se sabe si el oscuro cargó o falló.
 */
export function setMapTheme(map: MapLibreMap, theme: ResolvedTheme) {
  if (mapThemes.get(map) === theme) return;
  mapThemes.set(map, theme);
  pendingDarkStyles.get(map)?.();
  map.setStyle(MAP_STYLE_URLS[theme], { diff: false });
  if (theme === "dark") fallBackToLightStyle(map);
}

/**
 * El modo de pantalla para un mapa: lo devuelve (para crearlo con createMap) y, si cambia (p. ej.
 * «Automático» al anochecer), le cambia el estilo al mapa de `mapRef`.
 */
export function useMapTheme(mapRef: RefObject<MapLibreMap | null>): ResolvedTheme {
  const { resolved } = useThemeMode();
  useEffect(() => {
    if (mapRef.current) setMapTheme(mapRef.current, resolved);
  }, [mapRef, resolved]);
  return resolved;
}
