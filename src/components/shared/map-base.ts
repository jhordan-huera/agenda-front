import { setWorkerUrl, type Map as MapLibreMap, type MapOptions } from "maplibre-gl";
// MapLibre busca su worker junto a su propio archivo, que Vite mueve al empaquetar: se le
// indica dónde quedó (Vite lo empaqueta con lo que importa y lo sirve desde /assets).
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

/**
 * Mapa base: estilo vectorial "Liberty" de OpenFreeMap (datos de OpenStreetMap) dibujado con
 * MapLibre. Gratis, sin clave de API ni límite de visitas, y se puede usar en proyectos comerciales.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

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

/** Opciones comunes: mapa plano (sin girar ni inclinar) y créditos en un botón compacto. */
export const BASE_MAP_OPTIONS = {
  style: MAP_STYLE_URL,
  locale: MAP_LOCALE,
  attributionControl: { compact: true },
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  maxPitch: 0,
} satisfies Partial<MapOptions>;

const PIN_SVG = `<svg width="38" height="46" viewBox="0 0 36 44" aria-hidden="true" style="display:block;filter:drop-shadow(0 3px 4px rgba(15,23,42,.35))">
  <path d="M18 1C8.6 1 1 8.4 1 17.6 1 30 18 43 18 43s17-13 17-25.4C35 8.4 27.4 1 18 1Z" fill="#4a6cb0" stroke="#fff" stroke-width="2"/>
  <circle cx="18" cy="17" r="6" fill="#fff"/>
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
