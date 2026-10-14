import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DailyCounts, PlatformStats } from "@/types";
import { ADMIN_CHART, AXIS_TICK } from "./admin-chart-colors";
import { ChartLegend, ChartTable, TooltipBox } from "./chart-parts";

type Metric = keyof DailyCounts;

const METRICS: { value: Metric; label: string }[] = [
  { value: "appointments", label: "Citas agendadas" },
  { value: "onlineBookings", label: "Reservas online" },
  { value: "newClients", label: "Pacientes nuevos" },
];

interface Point {
  day: number;
  current: number | null;
  previous: number | null;
}

/** Suma día a día; donde el mes no tiene ese día (o todavía no llega), null para cortar la línea. */
function accumulate(daily: PlatformStats["growth"]["daily"], metric: Metric): Point[] {
  let current = 0;
  let previous = 0;
  return daily.map((day) => {
    if (day.current) current += day.current[metric];
    if (day.previous) previous += day.previous[metric];
    return { day: day.day, current: day.current ? current : null, previous: day.previous ? previous : null };
  });
}

/**
 * Día a día y acumulado: este mes hasta hoy (línea llena) frente al mes pasado completo (punteada),
 * para ver si va por delante o por detrás (spec 006, historia 5).
 */
export function GrowthChart({ growth }: { growth: PlatformStats["growth"] }) {
  const [metric, setMetric] = useState<Metric>("appointments");
  const currentMonth = capitalize(formatDate(growth.from, "MMMM"));
  const previousMonth = capitalize(formatDate(growth.previousFrom, "MMMM"));
  const data = accumulate(growth.daily, metric);
  const current = data.findLast((point) => point.current !== null)?.current ?? 0;
  const previous = data.findLast((point) => point.previous !== null)?.previous ?? 0;
  const label = METRICS.find((option) => option.value === metric)!.label;

  function GrowthTooltip({ active, payload }: TooltipContentProps) {
    const point = payload?.[0]?.payload as Point | undefined;
    if (!active || !point) return null;
    return (
      <TooltipBox
        title={`Día ${point.day} · acumulado`}
        lines={[
          ...(point.current === null ? [] : [{ label: currentMonth, value: point.current, color: ADMIN_CHART.series }]),
          ...(point.previous === null ? [] : [{ label: previousMonth, value: point.previous, color: ADMIN_CHART.previous }]),
        ]}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Día a día, acumulado</CardTitle>
          <CardDescription>
            {currentMonth} hasta hoy frente a {previousMonth.toLowerCase()} completo.
          </CardDescription>
        </div>
        <div role="radiogroup" aria-label="Qué cifra mirar" className="flex flex-wrap gap-1.5">
          {METRICS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={metric === option.value}
              onClick={() => setMetric(option.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                metric === option.value && "border-primary bg-accent text-ink hover:bg-accent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <ChartLegend
          items={[
            { label: currentMonth, color: ADMIN_CHART.series },
            { label: previousMonth, color: ADMIN_CHART.previous, dashed: true },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="h-64"
          role="img"
          aria-label={`${label} acumuladas día a día: ${current} en ${currentMonth.toLowerCase()} hasta hoy y ${previous} en todo ${previousMonth.toLowerCase()}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
              <CartesianGrid vertical={false} stroke={ADMIN_CHART.grid} />
              <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: ADMIN_CHART.axis }} interval="preserveStartEnd" minTickGap={12} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={GrowthTooltip} cursor={{ stroke: ADMIN_CHART.axis }} />
              <Line type="monotone" dataKey="previous" stroke={ADMIN_CHART.previous} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="current" stroke={ADMIN_CHART.series} strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <ChartTable
          head={["Día", `${currentMonth} (acumulado)`, `${previousMonth} (acumulado)`]}
          rows={data.map((point) => [point.day, point.current ?? "—", point.previous ?? "—"])}
        />
      </CardContent>
    </Card>
  );
}
