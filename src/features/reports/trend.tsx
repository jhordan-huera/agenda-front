import { cn } from "@/lib/utils";
import type { Comparison } from "./report-period";

const formatDelta = ({ delta, kind }: Comparison) =>
  kind === "points" ? `${Math.round(Math.abs(delta ?? 0) * 100)} pts` : `${Math.round(Math.abs(delta ?? 0) * 100)} %`;

/**
 * El cambio de una cifra frente al periodo anterior: "▲ 18 %", "▼ 5 %", "= igual". Verde si es bueno
 * y rojo si no (colores fijos, no los de la marca: un negocio con marca roja no debe leer "malo"
 * donde es bueno); la flecha y el texto para lectores de pantalla no dependen del color.
 * `comparison` null: el periodo anterior no tiene datos.
 */
export function Trend({ comparison, previousLabel, className }: { comparison: Comparison | null; previousLabel: string; className?: string }) {
  if (!comparison) {
    return <span className={cn("text-xs text-muted-foreground", className)}>Sin datos para comparar</span>;
  }
  const { delta, favorable } = comparison;
  const color = favorable === null ? "text-muted-foreground" : favorable ? "text-emerald-700" : "text-red-700";
  if (delta === 0 || (delta !== null && Math.round(Math.abs(delta) * 100) === 0)) {
    return (
      <span className={cn("text-xs font-semibold text-muted-foreground", className)}>
        = igual<span className="sr-only"> que {previousLabel}</span>
      </span>
    );
  }
  const rising = delta === null || delta > 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold tabular-nums", color, className)}>
      <span aria-hidden>{rising ? "▲" : "▼"}</span>
      {delta === null ? "antes 0" : formatDelta(comparison)}
      <span className="sr-only">
        {delta === null ? ` (antes no hubo, ${previousLabel})` : ` ${rising ? "más" : "menos"} que ${previousLabel}`}
      </span>
    </span>
  );
}
