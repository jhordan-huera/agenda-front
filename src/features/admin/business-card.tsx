import { CalendarClock, ExternalLink, UserRound } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { UsageMeter } from "@/features/billing/usage-meter";
import { formatNumericDate, toZonedDate } from "@/lib/format";
import type { AdminBusinessSummary, ISODate } from "@/types";
import { BusinessStatusBadge, PlanBadge } from "./business-badges";
import { BusinessMark } from "./business-mark";
import { activityLabel } from "./sales-lists";

/** Un negocio en la lista del super admin (spec 007): lo importante, sin abrir su ficha. */
export function BusinessCard({ summary, today }: { summary: AdminBusinessSummary; today: ISODate }) {
  const { business, owner, subscription, usage, lastActivityAt } = summary;
  const href = `/admin/businesses/${business.id}`;
  return (
    <article className="flex h-full flex-col rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-4 pb-3">
        <BusinessMark name={business.name} logoUrl={business.logoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold" title={business.name}>
            <Link to={href} className="rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              {business.name}
            </Link>
          </h3>
          <p className="truncate text-xs text-muted-foreground">/book/{business.slug}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {subscription && <PlanBadge plan={subscription.plan} />}
            <BusinessStatusBadge status={business.status} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 text-sm">
        <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className={owner ? "truncate" : "truncate text-muted-foreground"}>{owner?.name ?? "Sin propietario"}</p>
          {owner?.email && <p className="truncate text-xs text-muted-foreground">{owner.email}</p>}
        </div>
      </div>

      <div className="space-y-2.5 px-4 pt-3 pb-4">
        <UsageMeter label="Citas del mes" used={usage.appointmentsThisMonth} limit={usage.limits.appointmentsPerMonth} />
        <UsageMeter label="Usuarios" used={usage.users} limit={usage.limits.users} />
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t px-4 py-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Alta</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatNumericDate(toZonedDate(business.createdAt))}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden /> Última actividad
          </dt>
          <dd className="mt-0.5 font-medium">{activityLabel(lastActivityAt, today)}</dd>
        </div>
      </dl>

      <div className="flex gap-2 border-t p-3">
        <Button asChild size="sm" className="flex-1">
          <Link to={href} aria-label={`Ver la ficha de ${business.name}`}>
            Ver ficha
          </Link>
        </Button>
        {business.status === "active" && (
          <Button asChild size="sm" variant="outline">
            <a href={`/book/${business.slug}`} target="_blank" rel="noreferrer" aria-label={`Página pública de ${business.name} (se abre en otra pestaña)`}>
              <ExternalLink /> Página pública
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
