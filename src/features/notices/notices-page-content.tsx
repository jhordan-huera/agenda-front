import { CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { isNoticesUnavailable, useMarkAllNoticesRead, useNoticeFeed, useUnreadNotices, type NoticeScope } from "@/hooks/queries/use-notices";
import { NOTICE_DAYS, NOTICE_LIST_SIZE } from "@/lib/constants/notices";
import { plural } from "@/lib/format";
import { NoticeItem } from "./notice-item";
import { NoticesEmpty } from "./notice-list";
import { groupNoticesByDay, timeInDay } from "./notice-time";

const DESCRIPTION: Record<NoticeScope, string> = {
  business: `Lo que pasó en los últimos ${NOTICE_DAYS} días. Cada persona del equipo ve lo suyo y lleva su propio leído.`,
  platform: `Lo que pasó en la plataforma en los últimos ${NOTICE_DAYS} días.`,
};

interface NoticesPageContentProps {
  scope: NoticeScope;
  /** La zona del negocio (en /admin, la de la plataforma): de ella salen «Hoy» y «Ayer». */
  timezone: string;
}

/**
 * La página «Avisos» (spec 014, historia 3): los de los últimos 30 días, del más nuevo al más viejo y
 * agrupados por día («Hoy», «Ayer», «Mar 13 oct»), con «Sólo los no leídos», «Marcar todo como leído» y
 * «Cargar más». La misma en el panel del negocio y en /admin.
 */
export function NoticesPageContent({ scope, timezone }: NoticesPageContentProps) {
  const [onlyUnread, setOnlyUnread] = useState(false);
  const { unread } = useUnreadNotices(scope);
  const feed = useNoticeFeed(scope, { limit: NOTICE_LIST_SIZE, unread: onlyUnread });
  const markAll = useMarkAllNoticesRead(scope);
  const notices = feed.data?.pages.flatMap((page) => page.notices) ?? [];
  // «Hoy», «Ayer» y «hace 5 min» desde que llegó la lista (se pone al día con ella).
  const now = new Date(feed.dataUpdatedAt);

  return (
    <div className="space-y-6">
      <PageTitle title="Avisos" />
      <PageHeader
        title="Avisos"
        description={DESCRIPTION[scope]}
        actions={
          <Button type="button" variant="outline" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            {markAll.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCheck aria-hidden />}
            Marcar todo como leído
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-9 items-center gap-2 text-sm font-medium">
          <Switch checked={onlyUnread} onCheckedChange={setOnlyUnread} /> Sólo los no leídos
        </label>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {unread > 0 ? plural(unread, "aviso sin leer", "avisos sin leer") : "Todo leído"}
        </p>
      </div>

      {feed.isPending ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : feed.isError ? (
        isNoticesUnavailable(feed.error) ? (
          <NoticesEmpty scope={scope} className="rounded-2xl border border-dashed bg-card" />
        ) : (
          <ErrorState onRetry={() => feed.refetch()} />
        )
      ) : notices.length === 0 ? (
        onlyUnread ? (
          <div className="rounded-2xl border border-dashed bg-card px-4 py-10 text-center">
            <p className="font-medium">No tienes avisos sin leer</p>
            <p className="mt-1 text-sm text-muted-foreground">Apaga «Sólo los no leídos» para ver todos.</p>
          </div>
        ) : (
          <NoticesEmpty scope={scope} className="rounded-2xl border border-dashed bg-card" />
        )
      ) : (
        <div className="grid gap-4">
          {groupNoticesByDay(notices, timezone, now).map((day) => (
            <section key={day.date} aria-label={day.label} className="overflow-hidden rounded-2xl border bg-card">
              <h2 className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
                {day.label}
                <span className="text-xs font-normal text-muted-foreground">{plural(day.notices.length, "aviso", "avisos")}</span>
              </h2>
              <ol className="space-y-0.5 p-1.5">
                {day.notices.map((notice) => (
                  <NoticeItem key={notice.id} notice={notice} scope={scope} time={timeInDay(notice.createdAt, timezone, now)} />
                ))}
              </ol>
            </section>
          ))}
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
      )}
      <p className="text-xs text-muted-foreground">Los avisos se borran solos a los {NOTICE_DAYS} días.</p>
    </div>
  );
}
