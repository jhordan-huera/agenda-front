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

export const CHART_COLORS: ChartColors = {
  series: "#6d8fd1",
  soft: "#a9bde8",
  highlight: "#a99be0",
  grid: "#e3e7f0",
  axis: "#d2d8e5",
  tick: "#5b6478",
  cursor: "#f5f7fc",
};

/**
 * Los de Agenda360 en el modo oscuro (spec 019): `resolveBrandPalette(DEFAULT_BRAND_COLORS).dark.chart`,
 * igual que los tokens oscuros de src/index.css (`npm run check:contrast` comprueba que coinciden).
 */
export const CHART_COLORS_DARK: ChartColors = {
  series: "#7598da",
  soft: "#495b7d",
  highlight: "#7a69a3",
  grid: "#272b34",
  axis: "#383d48",
  tick: "#9ba5b8",
  cursor: "#1b1f27",
};
