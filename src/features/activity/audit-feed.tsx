import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "@/lib/format";
import type { AuditLog, AuditLogPage } from "@/types";
import { AuditEntry } from "./audit-entry";
import { groupItemsByDay } from "./day-groups";

interface AuditFeedProps<T extends AuditLog> {
  feed: UseInfiniteQueryResult<InfiniteData<AuditLogPage<T>>>;
  showBusiness?: boolean;
  /** Zona horaria de las fechas (la del negocio; sin ella, la de la plataforma). */
  timezone?: string;
  /** Una tarjeta por día: «Hoy», «Ayer» y la fecha (panel de plataforma, spec 007). */
  groupByDay?: boolean;
}

/** Lista de la auditoría con "Cargar más". */
export function AuditFeed<T extends AuditLog>({ feed, showBusiness, timezone, groupByDay }: AuditFeedProps<T>) {
  if (feed.isPending) return <Skeleton className="h-72" />;
  if (feed.isError) return <ErrorState onRetry={() => feed.refetch()} />;

  const entries = feed.data.pages.flatMap((page) => page.entries);
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
        <History className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">Sin actividad con estos filtros</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {groupByDay ? (
        groupItemsByDay(entries, (entry) => entry.createdAt, timezone).map((group) => (
          <section key={group.date} aria-label={group.label} className="overflow-hidden rounded-xl border bg-card">
            <h3 className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
              {group.label}
              <span className="text-xs font-normal text-muted-foreground">{plural(group.items.length, "acción", "acciones")}</span>
            </h3>
            <ol className="divide-y">
              {group.items.map((entry) => (
                <AuditEntry key={entry.id} entry={entry} showBusiness={showBusiness} timezone={timezone} />
              ))}
            </ol>
          </section>
        ))
      ) : (
        <ol className="divide-y rounded-lg border">
          {entries.map((entry) => (
            <AuditEntry key={entry.id} entry={entry} showBusiness={showBusiness} timezone={timezone} />
          ))}
        </ol>
      )}
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
