import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminBusinessSummary, ISODate } from "@/types";
import { PlanBadge } from "./business-badges";
import { idle, nearLimit, topGrowing } from "./sales-lists";

function List({ title, description, empty, loading, children }: { title: string; description: string; empty: string; loading: boolean; children: ReactNode[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24" />
        ) : children.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="-mx-3 divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ summary, children }: { summary: AdminBusinessSummary; children: ReactNode }) {
  return (
    <li>
      <Link to={`/admin/businesses/${summary.business.id}`} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{summary.business.name}</span>
            <PlanBadge plan={summary.usage.plan} />
          </span>
          <span className="block text-xs text-muted-foreground">{children}</span>
        </span>
      </Link>
    </li>
  );
}

/** «Negocios para vender» (spec 006): cerca del límite, los que más crecen y los que dejaron de usarlo. */
export function SalesSection({ businesses, loading, today }: { businesses: AdminBusinessSummary[]; loading: boolean; today: ISODate }) {
  return (
    <section aria-labelledby="sales-title" className="space-y-3">
      <div>
        <h2 id="sales-title" className="text-lg font-bold">
          Negocios para vender
        </h2>
        <p className="text-sm text-muted-foreground">A quién ofrecerle un plan mejor, quién crece y quién dejó de usar el sistema.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
        <List title="Cerca del límite" description="Usan el 80 % o más de su plan." empty="Nadie cerca del límite." loading={loading}>
          {nearLimit(businesses).map(({ summary, text, offer }) => (
            <Row key={summary.business.id} summary={summary}>
              {text}
              {offer && (
                <span className="mt-0.5 flex items-center gap-1 font-semibold text-primary">
                  <ArrowRight className="size-3.5" aria-hidden /> Ofrecerle {offer.name}
                </span>
              )}
            </Row>
          ))}
        </List>
        <List title="Los que más crecen" description="Citas agendadas frente al mes pasado." empty="Ninguno crece todavía este mes." loading={loading}>
          {topGrowing(businesses).map(({ summary, change }) => (
            <Row key={summary.business.id} summary={summary}>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                {change.kind === "new" ? <Sparkles className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
                {change.kind === "new" ? "Empezó este mes" : `+${change.percent} %`}
              </span>{" "}
              · {summary.growth.current} citas ({summary.growth.previous} el mes pasado)
            </Row>
          ))}
        </List>
        <List title="Dejaron de usarlo" description="Activos sin actividad hace 14 días o más." empty="Todos los negocios tienen actividad." loading={loading}>
          {idle(businesses, today).map(({ summary, days }) => (
            <Row key={summary.business.id} summary={summary}>
              {days === null ? "Todavía sin actividad" : `Sin actividad hace ${days} días`}
            </Row>
          ))}
        </List>
      </div>
    </section>
  );
}
