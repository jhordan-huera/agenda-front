import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLog, AuditLogPage } from "@/types";
import { AuditEntry } from "./audit-entry";

interface AuditFeedProps<T extends AuditLog> {
  feed: UseInfiniteQueryResult<InfiniteData<AuditLogPage<T>>>;
  showBusiness?: boolean;
  /** Zona horaria de las fechas (la del negocio; sin ella, la de la plataforma). */
  timezone?: string;
}

/** Lista de la auditoría con "Cargar más". */
export function AuditFeed<T extends AuditLog>({ feed, showBusiness, timezone }: AuditFeedProps<T>) {
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
      <ol className="divide-y rounded-lg border">
        {entries.map((entry) => (
          <AuditEntry key={entry.id} entry={entry} showBusiness={showBusiness} timezone={timezone} />
        ))}
      </ol>
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
