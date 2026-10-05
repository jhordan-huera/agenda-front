/**
 * Colores de los gráficos de Agenda360 como valores concretos (equivalentes a los tokens de
 * src/index.css). Recharts los escribe como atributos SVG y algunos navegadores no pintan
 * `fill="var(--x)"` en esos atributos, así que no se usan variables CSS aquí. Un negocio con
 * colores propios usa los suyos (useChartColors).
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
