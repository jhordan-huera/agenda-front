import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { capitalize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChartColors } from "@/features/branding/brand-palette-context";
import type { VolumePoint } from "./report-stats";

function VolumeTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as VolumePoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="min-w-44 rounded-lg border bg-popover p-3 text-xs shadow-md">
      <p className="font-medium">{capitalize(point.fullLabel)}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {point.total} cita{point.total === 1 ? "" : "s"}
      </p>
      <ul className="mt-2 space-y-1">
        {APPOINTMENT_STATUSES.filter((status) => point.byStatus[status] > 0).map((status) => (
          <li key={status} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", APPOINTMENT_STATUS_CONFIG[status].dot)} aria-hidden />
              {APPOINTMENT_STATUS_CONFIG[status].label}
            </span>
            <span className="text-foreground tabular-nums">{point.byStatus[status]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Columnas de una sola serie (sin leyenda: el título la nombra) + tabla accesible. */
export function AppointmentsVolumeChart({ data, groupedByWeek }: { data: VolumePoint[]; groupedByWeek: boolean }) {
  const title = groupedByWeek ? "Citas por semana" : "Citas por día";
  const colors = useChartColors();
  const axisTick = { fontSize: 11, fill: colors.tick };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Todas las citas del periodo. Pasa el cursor por una barra para ver el desglose.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-64" role="img" aria-label={`${title}: gráfico de columnas`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: colors.axis }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={VolumeTooltip} cursor={{ fill: colors.cursor }} />
              <Bar dataKey="total" name="Citas" fill={colors.series} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">{groupedByWeek ? "Semana" : "Día"}</th>
                  <th className="px-3 py-2 text-right font-medium">Citas</th>
                  <th className="px-3 py-2 text-right font-medium">Completadas</th>
                  <th className="px-3 py-2 text-right font-medium">Canceladas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((point) => (
                  <tr key={point.key}>
                    <td className="px-3 py-1.5">{capitalize(point.fullLabel)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{point.total}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{point.byStatus.completed}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{point.byStatus.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
