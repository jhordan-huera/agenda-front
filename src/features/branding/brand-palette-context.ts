import { createContext, useContext } from "react";
import {
  CHART_COLORS,
  CHART_COLORS_DARK,
  type ChartColors,
} from "@/features/reports/chart-colors";
import type { ResolvedTheme } from "@/features/theme/theme-mode";
import { useThemeMode } from "@/features/theme/use-theme-mode";
import type { BrandPalettes } from "@/lib/brand-theme";

/** Paleta del negocio que se está viendo, en sus dos modos; null: los colores de Agenda360. */
export const BrandPaletteContext = createContext<BrandPalettes | null>(null);

/**
 * Colores de los gráficos: los de la marca del negocio o los de Agenda360, en el modo de la
 * pantalla. `mode` fija uno: "light" en lo que se imprime, que siempre sale claro.
 */
export function useChartColors(mode?: ResolvedTheme): ChartColors {
  const palettes = useContext(BrandPaletteContext);
  const { resolved } = useThemeMode();
  const current = mode ?? resolved;
  return (
    palettes?.[current].chart ??
    (current === "dark" ? CHART_COLORS_DARK : CHART_COLORS)
  );
}
