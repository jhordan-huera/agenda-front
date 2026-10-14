import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminBusinessSummary } from "@/types";
import { useAdminChartColors } from "./admin-chart-colors";
import { ChartLegend } from "./chart-parts";

/** Negocios del gráfico (los de más citas este mes). */
const SHOWN = 8;

/**
 * Citas agendadas de cada negocio activo: este mes frente a los mismos días del mes pasado, en barras
 * horizontales con el nombre encima, para que se lea entero también en el celular (spec 006, historia 5).
 */
export function BusinessGrowthChart({ businesses }: { businesses: AdminBusinessSummary[] }) {
  const { colors } = useAdminChartColors();
  const rows = businesses
    .filter(({ business, growth }) => business.status === "active" && growth && (growth.current > 0 || growth.previous > 0))
    .sort((a, b) => b.growth.current - a.growth.current || b.growth.previous - a.growth.previous)
    .slice(0, SHOWN);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(({ growth }) => Math.max(growth.current, growth.previous)));
  const width = (value: number) => `${Math.max((value / max) * 100, value > 0 ? 1.5 : 0)}%`;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Citas por negocio</CardTitle>
          <CardDescription>
            {rows.length === 1 ? "El negocio" : `Los ${rows.length}`} con más citas agendadas este mes, frente a los mismos días del mes
            pasado.
          </CardDescription>
        </div>
        <ChartLegend
          items={[
            { label: "Este mes", color: colors.series },
            { label: "Mes pasado", color: colors.soft },
          ]}
        />
      </CardHeader>
      <CardContent>
        <ul className="space-y-3.5">
          {rows.map(({ business, growth }) => (
            <li key={business.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link to={`/admin/businesses/${business.id}`} className="min-w-0 truncate font-medium hover:underline">
                  {business.name}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{growth.current}</span> este mes · {growth.previous} antes
                </span>
              </div>
              <div className="mt-1.5 space-y-1" aria-hidden>
                <div className="h-2.5 rounded-full" style={{ width: width(growth.current), backgroundColor: colors.series }} />
                <div className="h-2.5 rounded-full" style={{ width: width(growth.previous), backgroundColor: colors.soft }} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
