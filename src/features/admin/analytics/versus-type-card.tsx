import { ArrowDown, ArrowRight, ArrowUp, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { formatCurrency } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AdminBusinessAnalytics } from "@/types";
import { computedLabel, formatGrowth, formatRate, RATE_KEYS, RATE_LABELS, versusTone } from "./analytics-format";
import { FewDataTag, HealthBadge } from "./analytics-parts";

/**
 * «Frente a su tipo» en la ficha del negocio de /admin (spec 016): su salud con los motivos, cada tasa
 * junto a la de su tipo (resaltada si es muy distinta) y, si lo está, por qué está listo para subir de
 * plan. Sale de la última foto de 30 días: no se calcula al abrir la ficha.
 */
export function VersusTypeCard({ analytics }: { analytics: AdminBusinessAnalytics | null }) {
  const today = getZonedNow(DEFAULT_TIMEZONE).date;
  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Frente a su tipo</CardTitle>
          <CardDescription>Las cifras se preparan cada mañana; vuelve en unos minutos.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const { business, category } = analytics;
  const comparable = category && !category.fewData && !business.fewData;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frente a su tipo</CardTitle>
        <CardDescription>
          {business.category.name} · últimos {analytics.periodDays} días · {computedLabel(analytics.computedAt, today)}
        </CardDescription>
        <CardAction>
          <HealthBadge score={business.health.score} group={business.health.group} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Salud</p>
          {business.health.reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin señales de riesgo.</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {business.health.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {business.appointments} citas · {formatGrowth(business.growth)} frente al periodo anterior
            </p>
            {business.fewData && <FewDataTag />}
          </div>
          {!comparable && (
            <p className="text-xs text-muted-foreground">
              {business.fewData
                ? "Con menos de 10 citas en el periodo no se compara con su tipo."
                : "Su tipo tiene pocos datos (menos de 3 negocios con 10 citas o más): no se compara."}
            </p>
          )}
          <dl className="divide-y rounded-lg border">
            {RATE_KEYS.map((key) => {
              const versus = business.versusType[key];
              const tone = versusTone(key, versus);
              const Arrow = versus === "above" ? ArrowUp : ArrowDown;
              return (
                <div key={key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <dt className="min-w-0 truncate text-muted-foreground">{RATE_LABELS[key]}</dt>
                  <dd className="flex shrink-0 items-center gap-2 tabular-nums">
                    <span className={cn("font-semibold", tone === "good" && "text-emerald-700 dark:text-emerald-300", tone === "bad" && "text-rose-700 dark:text-rose-300")}>
                      {tone && <Arrow className="mr-0.5 inline size-3.5" aria-hidden />}
                      {formatRate(business[key])}
                    </span>
                    {comparable && (
                      <span className="text-xs text-muted-foreground">
                        tipo {formatRate(category.medians[key])}
                        {tone && <span className="sr-only">{versus === "above" ? " (muy por encima)" : " (muy por debajo)"}</span>}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <dt className="text-muted-foreground">Ticket promedio</dt>
              <dd className="flex shrink-0 items-center gap-2 tabular-nums">
                <span className="font-semibold">{business.averageTicket === null ? "—" : formatCurrency(business.averageTicket, business.currency)}</span>
                {comparable && category.averageTicket !== null && (
                  <span className="text-xs text-muted-foreground">tipo {formatCurrency(category.averageTicket, business.currency)}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {business.upsell.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-accent px-3 py-2.5">
            <p className="text-sm font-semibold text-ink">Listo para subir de plan</p>
            <ul className="space-y-0.5 text-sm">
              {business.upsell.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5">
                  <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link to="/admin/analytics" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          Ver la analítica <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
