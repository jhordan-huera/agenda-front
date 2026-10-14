import { CHART_COLORS } from "@/features/reports/chart-colors";

/**
 * Colores de los gráficos del inicio del super admin (spec 006): los de Agenda360, porque el panel de
 * plataforma no tiene la marca de un negocio.
 */
export const ADMIN_CHART = {
  ...CHART_COLORS,
  /** El periodo con el que se compara (mes pasado): gris, con contraste ≥ 3:1 sobre blanco. */
  previous: "#8a93a6",
  /** Emails que fallaron. */
  failed: "#e05d74",
};

export const AXIS_TICK = { fontSize: 11, fill: ADMIN_CHART.tick };
