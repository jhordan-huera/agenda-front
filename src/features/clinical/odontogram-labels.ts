import type { ToothState, ToothSurface, ToothSurfaceState, ToothWholeState } from "@/types";

/** Estados de una superficie, con su color en el odontograma. */
export const SURFACE_STATES: { value: ToothSurfaceState; label: string; color: string }[] = [
  { value: "caries", label: "Caries", color: "#ef4444" },
  { value: "obturado", label: "Obturación", color: "#3b82f6" },
  { value: "sellante", label: "Sellante", color: "#22c55e" },
  { value: "fractura", label: "Fractura", color: "#f97316" },
];

/** Estados de la pieza completa, con el símbolo que la marca. */
export const WHOLE_STATES: { value: ToothWholeState; label: string; symbol: string; color: string }[] = [
  { value: "corona", label: "Corona", symbol: "◯", color: "#2563eb" },
  { value: "endodoncia", label: "Endodoncia", symbol: "▢", color: "#9333ea" },
  { value: "extraccion", label: "Extracción indicada", symbol: "✕", color: "#dc2626" },
  { value: "ausente", label: "Ausente", symbol: "✕", color: "#475569" },
  { value: "implante", label: "Implante", symbol: "I", color: "#2563eb" },
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
