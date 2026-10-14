import { useChartColors } from "@/features/branding/brand-palette-context";

/** Lo que significa algo y no cambia con la marca: el periodo con el que se compara y lo que falló. */
const FIXED = {
  /** El mes pasado: gris, con contraste ≥ 3:1 sobre blanco. */
  previous: "#8a93a6",
  /** Emails que fallaron. */
  failed: "#e05d74",
};

/**
 * Colores de los gráficos del inicio del super admin: los de la paleta del panel (los que eligió cada
 * super admin, spec 007, o los de Agenda360), más los dos fijos.
 */
export function useAdminChartColors() {
  const colors = { ...useChartColors(), ...FIXED };
  return { colors, axisTick: { fontSize: 11, fill: colors.tick } };
}
