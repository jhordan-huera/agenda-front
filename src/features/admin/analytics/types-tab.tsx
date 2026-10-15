import { Link } from "react-router";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RankedBars } from "@/features/reports/ranked-bars";
import { formatCurrency, plural } from "@/lib/format";
import type { AnalyticsSnapshot, BusinessAnalytics, CategoryAnalytics } from "@/types";
import { dayName, formatRate, hourLabel, RATE_KEYS, RATE_LABELS } from "./analytics-format";
import { FewDataTag, HealthBadge } from "./analytics-parts";

function Typical({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 px-3 py-2">
      <dt className="text-xs leading-tight text-muted-foreground">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function CategoryCard({ category, members }: { category: CategoryAnalytics; members: BusinessAnalytics[] }) {
  const currency = members[0]?.currency;
  const busiest = Math.max(1, ...category.topDays.map((day) => day.appointments), ...category.topHours.map((hour) => hour.appointments));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{category.name}</CardTitle>
        <CardDescription>
          {plural(category.businesses, "negocio activo", "negocios activos")} · {category.withData} con 10 citas o más
        </CardDescription>
        {category.fewData && (
          <CardAction>
            <FewDataTag />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {category.fewData ? (
          <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
            Pocos datos: hacen falta 3 negocios con 10 citas o más en el periodo para dar el valor típico. Sus negocios no se
            comparan con el tipo.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RATE_KEYS.map((key) => (
              <Typical key={key} label={RATE_LABELS[key]} value={formatRate(category.medians[key])} />
            ))}
            <Typical label="Ticket promedio" value={category.averageTicket === null ? "—" : formatCurrency(category.averageTicket, currency)} />
            <Typical label="Citas por agenda" value={category.appointmentsPerAgenda === null ? "—" : String(Math.round(category.appointmentsPerAgenda))} />
          </dl>
        )}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Días de más demanda</h3>
            {category.topDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin citas en el periodo.</p>
            ) : (
              <RankedBars
                max={busiest}
                items={category.topDays.map((day) => ({
                  key: String(day.day),
                  label: dayName(day.day),
                  value: day.appointments,
                  detail: plural(day.appointments, "cita", "citas"),
                }))}
              />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Horas de más demanda</h3>
            {category.topHours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin citas en el periodo.</p>
            ) : (
              <RankedBars
                max={busiest}
                items={category.topHours.map((hour) => ({
                  key: String(hour.hour),
                  label: `Desde las ${hourLabel(hour.hour)}`,
                  value: hour.appointments,
                  detail: plural(hour.appointments, "cita", "citas"),
                }))}
              />
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Sus negocios</h3>
          <ul className="-mx-2 divide-y">
            {members.map((business) => (
              <li key={business.id}>
                <Link to={`/admin/businesses/${business.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{business.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{plural(business.appointments, "cita", "citas")}</span>
                  <HealthBadge score={business.health.score} group={business.health.group} className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Pestaña «Por tipo de negocio» (Historia 2): el valor típico (la mediana) de cada tipo, con sus negocios
 * activos de 10 citas o más, y los días y horas de más demanda. Con menos de 3 negocios con datos, «pocos
 * datos». Cada negocio frente a su tipo se ve en la tabla y en su ficha.
 */
export function TypesTab({ snapshot }: { snapshot: AnalyticsSnapshot }) {
  const active = snapshot.businesses.filter((business) => business.status === "active");
  if (snapshot.categories.length === 0) {
    return <p className="rounded-xl border border-dashed bg-background px-4 py-8 text-center text-sm text-muted-foreground">Aún no hay negocios activos.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        El valor típico es la mediana de los negocios activos del tipo con 10 citas o más en el periodo: un negocio muy grande no lo
        tuerce. Los suspendidos no cuentan.
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
        {snapshot.categories.map((category) => (
          <CategoryCard
            key={category.id ?? "sin-tipo"}
            category={category}
            members={active.filter((business) => business.category.id === category.id).sort((a, b) => b.appointments - a.appointments)}
          />
        ))}
      </div>
    </div>
  );
}
