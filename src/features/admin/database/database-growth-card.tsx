import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { capitalize, formatDate } from "@/lib/format";
import type { DatabaseHistoryPoint, DatabaseProjection, DatabaseStats } from "@/types";
import { useAdminChartColors } from "../admin-chart-colors";
import { ChartTable, TooltipBox } from "../chart-parts";
import { formatBytes, formatMonths, isSectionError, PROJECTION_MIN_DAYS } from "./database-format";
import { HelpNote, SectionError, SectionNotice } from "./database-parts";

/** El punto activo, con el borde del color de la tarjeta (Recharts lo pone blanco). */
const ACTIVE_DOT = { style: { stroke: "var(--card)" } };

const MB = 1024 * 1024;

type Point = DatabaseHistoryPoint & { label: string; mb: number };

/** «Crece unos X MB por mes. A este ritmo, llega al 70 % en N meses y se llena en M.» */
function projectionText(projection: DatabaseProjection | null, days: number): string {
  if (!projection) {
    return `Hacen falta unos días de datos para calcularlo (hay ${days} de ${PROJECTION_MIN_DAYS}). El cron guarda una foto cada mañana.`;
  }
  const { bytesPerMonth, monthsTo70, monthsToFull } = projection;
  if (monthsToFull === 0) return "Ya llegó al tope del plan: toca pasar a un plan mayor de Supabase.";
  if (bytesPerMonth <= 0 || monthsToFull === null) {
    return `No crece: en los últimos ${projection.days} días se mantuvo igual o bajó. No hay que hacer nada.`;
  }
  const growth = `Crece unos ${formatBytes(bytesPerMonth)} por mes.`;
  if (monthsTo70 === 0) return `${growth} Ya pasó el 70 % del tope; a este ritmo, se llena en ${formatMonths(monthsToFull)}.`;
  return `${growth} A este ritmo, llega al 70 % en ${formatMonths(monthsTo70!)} y se llena en ${formatMonths(monthsToFull)}.`;
}

/**
 * «Cómo crece» (historia 2): el tamaño de la base de los últimos 90 días (una foto por día, la guarda el
 * cron) y, con 7 días o más, cuándo llegaría al 70 % y al tope.
 */
export function DatabaseGrowthCard({ stats }: { stats: DatabaseStats }) {
  const { colors, axisTick } = useAdminChartColors();
  const history = isSectionError(stats.history) ? null : stats.history;
  const data: Point[] = (history ?? []).map((point) => ({ ...point, label: formatDate(point.day, "d MMM"), mb: point.sizeBytes / MB }));
  const first = data[0];
  const last = data.at(-1);

  function GrowthTooltip({ active, payload }: TooltipContentProps) {
    const point = payload?.[0]?.payload as Point | undefined;
    if (!active || !point) return null;
    return (
      <TooltipBox
        title={capitalize(formatDate(point.day, "EEEE d 'de' MMMM"))}
        lines={[{ label: "La base", value: formatBytes(point.sizeBytes), color: colors.series }]}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" aria-hidden /> Cómo crece
        </CardTitle>
        <CardDescription>El tamaño de la base en los últimos 90 días. El cron guarda una foto cada mañana, después de las 06:00.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!history ? (
          <SectionError message={(stats.history as { error: string }).error} />
        ) : data.length === 0 ? (
          <SectionNotice title="Todavía no hay fotos" description="El cron guarda la primera mañana, después de las 06:00. El gráfico empieza ese día." />
        ) : (
          <>
            <div
              className="h-56"
              role="img"
              aria-label={`El tamaño de la base: ${formatBytes(first!.sizeBytes)} el ${formatDate(first!.day, "d 'de' MMMM")} y ${formatBytes(last!.sizeBytes)} el ${formatDate(last!.day, "d 'de' MMMM")}.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                  <CartesianGrid vertical={false} stroke={colors.grid} />
                  <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: colors.axis }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    domain={["auto", "auto"]}
                    tickFormatter={(value: number) => `${value.toFixed(value < 10 ? 1 : 0).replace(".", ",")} MB`}
                  />
                  <Tooltip content={GrowthTooltip} cursor={{ stroke: colors.axis }} />
                  <Line
                    type="monotone"
                    dataKey="mb"
                    stroke={colors.series}
                    strokeWidth={2}
                    dot={data.length === 1 ? { r: 4, fill: colors.series } : false}
                    activeDot={ACTIVE_DOT}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ChartTable
              head={["Día", "La base", "Los archivos"]}
              rows={[...data].reverse().map((point) => [
                capitalize(formatDate(point.day, "EEE d MMM")),
                formatBytes(point.sizeBytes),
                point.filesBytes === null ? "—" : formatBytes(point.filesBytes),
              ])}
            />
          </>
        )}
        {history && <HelpNote>{projectionText(stats.projection, history.length)}</HelpNote>}
      </CardContent>
    </Card>
  );
}
