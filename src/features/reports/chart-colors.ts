/**
 * Colores de los gráficos de Agenda360 como valores concretos (equivalentes a los tokens de
 * src/index.css). Recharts los escribe como atributos SVG y algunos navegadores no pintan
 * `fill="var(--x)"` en esos atributos, así que no se usan variables CSS aquí. Un negocio con
 * colores propios usa los suyos, y cada modo (claro u oscuro) los suyos (useChartColors).
 */
export interface ChartColors {
  /** Serie principal: más suave que --primary, con contraste ≥ 3:1 sobre blanco. */
  series: string;
  /** --chart-2 */
  soft: string;
  /** --chart-3 */
  highlight: string;
  /** --border */
  grid: string;
  /** --input */
  axis: string;
  /** --muted-foreground */
  tick: string;
  /** --muted */
  cursor: string;
}

/**
 * Los de Agenda360 en el claro (spec 033: el tomate y el durazno): `resolveBrandPalette(DEFAULT_BRAND_COLORS)
 * .light.chart`, igual que los tokens de src/index.css (`npm run check:contrast` comprueba que coinciden).
 */
export const CHART_COLORS: ChartColors = {
  series: "#df663e",
  soft: "#ecab97",
  highlight: "#d79669",
  grid: "#f2e4df",
  axis: "#e7d3cd",
  tick: "#7a5c53",
  cursor: "#fdf5f3",
};

/**
 * Los de Agenda360 en el modo oscuro (spec 019): `resolveBrandPalette(DEFAULT_BRAND_COLORS).dark.chart`,
 * igual que los tokens oscuros de src/index.css (`npm run check:contrast` comprueba que coinciden).
 */
export const CHART_COLORS_DARK: ChartColors = {
  series: "#e96f48",
  soft: "#7f4b3b",
  highlight: "#9d663e",
  grid: "#342824",
  axis: "#493934",
  tick: "#ba9d94",
  cursor: "#281c18",
};
