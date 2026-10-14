import { Link } from "react-router";
import { formatNumericDate, toZonedDate } from "@/lib/format";
import type { AdminBusinessSummary, ISODate } from "@/types";
import { daysSince } from "./attention";
import { BusinessStatusBadge, PlanBadge } from "./business-badges";

/** "hoy", "ayer", "hace 5 días" o la fecha (más de un mes); "sin actividad" si nunca. */
function lastActivity(iso: string | null, today: ISODate): string {
  const days = daysSince(iso, today);
  if (days === null) return "Sin actividad";
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  return formatNumericDate(toZonedDate(iso!));
}

const COLUMNS = "sm:grid sm:grid-cols-[minmax(0,1fr)_6rem_7rem_6rem_7.5rem] sm:items-center sm:gap-3";

/**
 * Los negocios con su actividad: plan, citas del mes (con el cupo del plan, si tiene), pacientes y
 * última actividad. En el celular, cada uno en dos líneas.
 */
export function BusinessActivityList({ businesses, today }: { businesses: AdminBusinessSummary[]; today: ISODate }) {
  return (
    <div className="-mx-3">
      <div className={`hidden px-3 pb-2 text-xs font-medium text-muted-foreground ${COLUMNS}`} aria-hidden>
        <span>Negocio</span>
        <span>Plan</span>
        <span className="text-right">Citas del mes</span>
        <span className="text-right">Pacientes</span>
        <span className="text-right">Actividad</span>
      </div>
      <ul className="divide-y">
        {businesses.map(({ business, owner, usage, lastActivityAt }) => {
          const limit = usage.limits.appointmentsPerMonth;
          return (
            <li key={business.id}>
              <Link
                to={`/admin/businesses/${business.id}`}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-3 hover:bg-muted ${COLUMNS}`}
              >
                <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{business.name}</span>
                    {business.status !== "active" && <BusinessStatusBadge status={business.status} />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{owner?.name ?? "Sin propietario"}</span>
                </span>
                <span>
                  <PlanBadge plan={usage.plan} />
                </span>
                <span className="text-sm tabular-nums sm:text-right">
                  {usage.appointmentsThisMonth}
                  {limit !== null && <span className="text-muted-foreground"> / {limit}</span>}
                  <span className="text-muted-foreground sm:hidden"> citas</span>
                </span>
                <span className="text-sm tabular-nums sm:text-right">
                  {usage.clients}
                  <span className="text-muted-foreground sm:hidden"> pacientes</span>
                </span>
                <span className="text-sm text-muted-foreground sm:text-right">{lastActivity(lastActivityAt, today)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
