import type { ToothState, ToothSurface, ToothSurfaceState, ToothWholeState } from "@/types";

/**
 * Los colores del odontograma como variables CSS, para el contenedor que lo dibuja (spec 019). Cada
 * color dice algo (caries, obturación…), así que no sigue a la marca: en el claro son los de siempre
 * y, en el oscuro, el mismo color un paso más claro, para que se distinga del fondo oscuro y de los
 * demás. La variante `dark:` sólo vale en pantalla: lo impreso sale siempre con los claros.
 * También el borde de las piezas y la línea media, que en el oscuro van más apagados.
 */
export const ODONTOGRAM_COLORS = [
  "[--tooth-caries:#ef4444] dark:[--tooth-caries:#f87171]",
  "[--tooth-obturado:#3b82f6] dark:[--tooth-obturado:#60a5fa]",
  "[--tooth-sellante:#22c55e] dark:[--tooth-sellante:#4ade80]",
  "[--tooth-fractura:#f97316] dark:[--tooth-fractura:#fb923c]",
  "[--tooth-azul:#2563eb] dark:[--tooth-azul:#3b82f6]",
  "[--tooth-endodoncia:#9333ea] dark:[--tooth-endodoncia:#a855f7]",
  "[--tooth-extraccion:#dc2626] dark:[--tooth-extraccion:#ef4444]",
  "[--tooth-ausente:#475569] dark:[--tooth-ausente:#94a3b8]",
  "[--tooth-line:#94a3b8] dark:[--tooth-line:#64748b]",
  "[--tooth-midline:#cbd5e1] dark:[--tooth-midline:#334155]",
].join(" ");

/** Estados de una superficie, con su color en el odontograma (las variables de ODONTOGRAM_COLORS). */
export const SURFACE_STATES: { value: ToothSurfaceState; label: string; color: string }[] = [
  { value: "caries", label: "Caries", color: "var(--tooth-caries)" },
  { value: "obturado", label: "Obturación", color: "var(--tooth-obturado)" },
  { value: "sellante", label: "Sellante", color: "var(--tooth-sellante)" },
  { value: "fractura", label: "Fractura", color: "var(--tooth-fractura)" },
];

/** Estados de la pieza completa, con el símbolo que la marca. La corona y el implante van en el mismo azul. */
export const WHOLE_STATES: { value: ToothWholeState; label: string; symbol: string; color: string }[] = [
  { value: "corona", label: "Corona", symbol: "◯", color: "var(--tooth-azul)" },
  { value: "endodoncia", label: "Endodoncia", symbol: "▢", color: "var(--tooth-endodoncia)" },
  { value: "extraccion", label: "Extracción indicada", symbol: "✕", color: "var(--tooth-extraccion)" },
  { value: "ausente", label: "Ausente", symbol: "✕", color: "var(--tooth-ausente)" },
  { value: "implante", label: "Implante", symbol: "I", color: "var(--tooth-azul)" },
];

const SURFACE_NAMES: Record<ToothSurface, string> = { O: "oclusal", M: "mesial", D: "distal", V: "vestibular", L: "lingual/palatina" };

/** "Caries (oclusal, mesial) · Corona · nota". */
export function describeTooth(state: ToothState): string {
  const bySurfaceState = new Map<ToothSurfaceState, ToothSurface[]>();
  for (const [surface, surfaceState] of Object.entries(state.surfaces ?? {}) as [ToothSurface, ToothSurfaceState][]) {
    bySurfaceState.set(surfaceState, [...(bySurfaceState.get(surfaceState) ?? []), surface]);
  }
  const parts = [
    ...[...bySurfaceState].map(([surfaceState, surfaces]) => {
      const label = SURFACE_STATES.find((s) => s.value === surfaceState)?.label ?? surfaceState;
      return `${label} (${surfaces.map((surface) => SURFACE_NAMES[surface]).join(", ")})`;
    }),
    state.whole && (WHOLE_STATES.find((s) => s.value === state.whole)?.label ?? state.whole),
    state.note,
  ].filter(Boolean);
  return parts.join(" · ");
}
