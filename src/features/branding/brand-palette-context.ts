import { createContext, useContext } from "react";
import {
  CHART_COLORS,
  type ChartColors,
} from "@/features/reports/chart-colors";
import type { BrandPalette } from "@/lib/brand-theme";

/** Paleta del negocio que se está viendo; null: los colores de Agenda360. */
export const BrandPaletteContext = createContext<BrandPalette | null>(null);

/** Colores de los gráficos: los de la marca del negocio o los de Agenda360. */
export function useChartColors(): ChartColors {
  return useContext(BrandPaletteContext)?.chart ?? CHART_COLORS;
}
