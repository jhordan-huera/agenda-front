/**
 * Colores del gráfico como valores concretos (equivalentes a los tokens de src/index.css).
 * Recharts los escribe como atributos SVG y algunos navegadores no pintan `fill="var(--x)"`
 * en esos atributos, así que no se usan variables CSS aquí.
 */
export const CHART_COLORS = {
  /** --primary · oklch(0.51 0.23 277). Validado con el validador de paleta (contraste ≥ 3:1). */
  series: "#4f46e5",
  /** --border */
  grid: "#e5e6ea",
  /** --input */
  axis: "#dedfe4",
  /** --muted-foreground */
  tick: "#6a6f7b",
  /** --muted */
  cursor: "#f6f7f9",
} as const;
