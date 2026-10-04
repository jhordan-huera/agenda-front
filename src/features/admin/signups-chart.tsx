import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/features/reports/chart-colors";
import { capitalize, formatDate } from "@/lib/format";
import type { PlatformStats } from "@/types";

const AXIS_TICK = { fontSize: 11, fill: CHART_COLORS.tick };

interface Point {
  label: string;
  fullLabel: string;
  count: number;
}

function SignupsTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as Point | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 text-xs shadow-md">
      <p className="font-medium">{point.fullLabel}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {point.count} negocio{point.count === 1 ? "" : "s"} nuevo{point.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

/** Negocios creados por mes (registro propio o alta del super admin). */
export function SignupsChart({ data }: { data: PlatformStats["signupsByMonth"] }) {
  const points: Point[] = data.map(({ month, count }) => ({
    label: capitalize(formatDate(`${month}-01`, "MMM")),
    fullLabel: capitalize(formatDate(`${month}-01`, "MMMM yyyy")),
    count,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevos negocios</CardTitle>
        <CardDescription>Altas por mes en los últimos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56" role="img" aria-label={`Nuevos negocios por mes: ${points.map((p) => `${p.fullLabel} ${p.count}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.axis }} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={SignupsTooltip} cursor={{ fill: CHART_COLORS.cursor }} />
              <Bar dataKey="count" name="Negocios" fill={CHART_COLORS.series} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
