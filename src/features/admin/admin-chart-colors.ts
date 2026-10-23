import { useChartColors } from "@/features/branding/brand-palette-context";
import { useThemeMode } from "@/features/theme/use-theme-mode";
import { similarHue } from "@/lib/brand-theme";

/**
 * Lo que significa algo y no cambia con la marca: el periodo con el que se compara y lo que falló.
 * Cada uno con su versión para el fondo oscuro (spec 019): el gris más apagado, para que el mes
 * pasado quede detrás de la serie, y el rojo algo más claro.
 */
const FIXED = {
  light: {
    /** El mes pasado: gris, con contraste ≥ 3:1 sobre blanco. */
    previous: "#8a93a6",
    /** Emails que fallaron. */
    failed: "#e05d74",
  },
  dark: {
    /** ≥ 3,7:1 sobre el fondo oscuro de Agenda360 y de cada paleta lista. */
    previous: "#6b7385",
    /** ≥ 6:1 sobre el fondo oscuro. */
    failed: "#e8798c",
  },
};

/**
 * Lo que falló, cuando la serie del panel ya es rojiza, para que «Enviados» y «Fallidos» no se confundan:
 * ámbar (por ejemplo, con la paleta Rosa) y, si la serie también se parece al ámbar (el tomate de
 * Agenda360 desde la spec 033, la paleta Coral), magenta. ≥ 3:1 sobre el fondo de cada modo.
 */
const FAILED_ON_RED = [
  { light: "#c26a08", dark: "#f0a43a" },
  { light: "#b0478f", dark: "#e07bbd" },
];

/**
 * Colores de los gráficos del inicio del super admin, en el modo de la pantalla: los de la paleta del
 * panel (los que eligió cada super admin, spec 007, o los de Agenda360), más los dos fijos.
 */
export function useAdminChartColors() {
  const { resolved } = useThemeMode();
  const chart = useChartColors();
  const fixed = FIXED[resolved];
  const failed =
    [fixed.failed, ...FAILED_ON_RED.map((colors) => colors[resolved])].find((color) => !similarHue(chart.series, color)) ??
    fixed.failed;
  const colors = { ...chart, ...fixed, failed };
  return { colors, axisTick: { fontSize: 11, fill: colors.tick } };
}
