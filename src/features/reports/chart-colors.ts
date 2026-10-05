/**
 * Colores del gráfico como valores concretos (equivalentes a los tokens de src/index.css).
 * Recharts los escribe como atributos SVG y algunos navegadores no pintan `fill="var(--x)"`
 * en esos atributos, así que no se usan variables CSS aquí.
 */
export const CHART_COLORS = {
  /** Azul medio (más suave que --primary). Contraste con el fondo blanco ≥ 3:1. */
  series: "#6d8fd1",
  /** --border */
  grid: "#e3e7f0",
  /** --input */
  axis: "#d2d8e5",
  /** --muted-foreground */
  tick: "#5b6478",
  /** --muted */
  cursor: "#f5f7fc",
} as const;
