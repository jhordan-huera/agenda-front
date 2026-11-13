import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditChanges } from "@/features/activity/audit-entry";
import { isFailedLogin } from "@/features/activity/audit-filters";
import { groupItemsByDay } from "@/features/activity/day-groups";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { formatClockTime } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import { describeUserAgent } from "@/lib/user-agent";
import { cn } from "@/lib/utils";
import type { AdminAuditLog, AuditLogPage } from "@/types";
import { ledgerDay } from "./date-range";

interface ActivityLedgerProps {
  feed: UseInfiniteQueryResult<InfiniteData<AuditLogPage<AdminAuditLog>>>;
  /** El super admin que mira: sus acciones dicen «Tú». */
  currentUserId?: string;
  /** «Limpiar los filtros» cuando no hay nada con ellos. */
  onClearFilters?: () => void;
}

/**
 * La actividad de /admin → Actividad (spec 049), en una sola superficie: el día a la izquierda (arriba en el
 * celular) y, en cada fila, la hora, la frase, quién lo hizo, desde dónde (en las sesiones), los cambios y el
 * negocio como enlace a su ficha.
 */
export function ActivityLedger({ feed, currentUserId, onClearFilters }: ActivityLedgerProps) {
  if (feed.isPending) return <Skeleton className="h-72 rounded-xl" />;
  if (feed.isError) return <ErrorState onRetry={() => feed.refetch()} />;

  const entries = feed.data.pages.flatMap((page) => page.entries);
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-10 text-center">
        <History className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">Sin actividad con estos filtros</p>
        {onClearFilters && (
          <Button type="button" variant="link" size="sm" onClick={onClearFilters}>
            Limpiar los filtros
          </Button>
        )}
      </div>
    );
  }

  const today = getZonedNow(DEFAULT_TIMEZONE).date;
  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {groupItemsByDay(entries, (entry) => entry.createdAt).map((group, index) => {
          const day = ledgerDay(group.date, today);
          return (
            <section
              key={group.date}
              aria-label={group.label}
              className={cn("grid md:grid-cols-[9.5rem_minmax(0,1fr)]", index > 0 && "border-t")}
            >
              <h3 className="flex items-baseline gap-2 border-b bg-muted/60 px-4 py-2 text-sm font-semibold md:block md:border-b-0 md:px-5 md:py-4">
                {day.title}
                <span className="text-xs font-normal text-muted-foreground md:mt-0.5 md:block">{day.subtitle}</span>
              </h3>
              <ol className="divide-y">
                {group.items.map((entry) => (
                  <LedgerRow
                    key={entry.id}
                    entry={entry}
                    // Un intento fallido contra tu cuenta no lo hiciste tú: va con el nombre de la cuenta.
                    mine={Boolean(currentUserId) && entry.actorId === currentUserId && !isFailedLogin(entry.action)}
                  />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      {feed.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="justify-self-center"
          disabled={feed.isFetchingNextPage}
          onClick={() => feed.fetchNextPage()}
        >
          {feed.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
          Cargar más
        </Button>
      )}
    </div>
  );
}

function LedgerRow({ entry, mine }: { entry: AdminAuditLog; mine: boolean }) {
  const failed = isFailedLogin(entry.action);
  return (
    <li className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 px-4 py-3.5 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:gap-x-4 md:px-5">
      <time dateTime={entry.createdAt} className="pt-px text-[0.8125rem] text-muted-foreground tabular-nums">
        {formatClockTime(entry.createdAt)}
      </time>
      <div className="min-w-0">
        <p className={cn("text-sm leading-relaxed [overflow-wrap:anywhere]", failed && "font-medium text-destructive")}>{entry.summary}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{mine ? "Tú" : entry.actorName}</p>
        {entry.ip && (
          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {describeUserAgent(entry.userAgent)} · IP {entry.ip}
          </p>
        )}
        <AuditChanges changes={entry.changes ?? []} />
      </div>
      {entry.businessId && entry.businessName && (
        <Link
          to={`/admin/businesses/${entry.businessId}`}
          title={entry.businessName}
          className="col-start-2 mt-2 max-w-full self-start justify-self-start truncate rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 md:col-start-3 md:row-start-1 md:mt-0 md:max-w-56"
        >
          {entry.businessName}
        </Link>
      )}
    </li>
  );
}
