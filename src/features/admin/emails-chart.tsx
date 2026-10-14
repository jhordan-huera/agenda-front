import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize, formatDate } from "@/lib/format";
import type { PlatformStats } from "@/types";
import { ADMIN_CHART, AXIS_TICK } from "./admin-chart-colors";
import { ChartLegend, ChartTable, TooltipBox } from "./chart-parts";

type Day = PlatformStats["health"]["emailsByDay"][number] & { label: string };

/** Emails enviados y fallidos de los últimos 14 días, en columnas apiladas (spec 006, historia 5). */
export function EmailsChart({ days }: { days: PlatformStats["health"]["emailsByDay"] }) {
  const data: Day[] = days.map((day) => ({ ...day, label: formatDate(day.date, "d MMM") }));
  const sent = days.reduce((total, day) => total + day.sent, 0);
  const failed = days.reduce((total, day) => total + day.failed, 0);

  function EmailsTooltip({ active, payload }: TooltipContentProps) {
    const day = payload?.[0]?.payload as Day | undefined;
    if (!active || !day) return null;
    return (
      <TooltipBox
        title={capitalize(formatDate(day.date, "EEEE d 'de' MMMM"))}
        lines={[
          { label: "Enviados", value: day.sent, color: ADMIN_CHART.series },
          { label: "Fallidos", value: day.failed, color: ADMIN_CHART.failed },
        ]}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Emails de los últimos 14 días</CardTitle>
          <CardDescription>
            {sent} enviados y {failed} fallidos (sin contar los que el sistema descarta a propósito).
          </CardDescription>
        </div>
        <ChartLegend
          items={[
            { label: "Enviados", color: ADMIN_CHART.series },
            { label: "Fallidos", color: ADMIN_CHART.failed },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-56" role="img" aria-label={`Emails de los últimos 14 días: ${sent} enviados y ${failed} fallidos.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -4 }}>
              <CartesianGrid vertical={false} stroke={ADMIN_CHART.grid} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: ADMIN_CHART.axis }} interval="preserveStartEnd" minTickGap={8} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={EmailsTooltip} cursor={{ fill: ADMIN_CHART.cursor }} />
              <Bar dataKey="sent" stackId="emails" fill={ADMIN_CHART.series} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="failed" stackId="emails" fill={ADMIN_CHART.failed} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <ChartTable
          head={["Día", "Enviados", "Fallidos"]}
          rows={data.map((day) => [capitalize(formatDate(day.date, "EEE d MMM")), day.sent, day.failed])}
        />
      </CardContent>
    </Card>
  );
}
