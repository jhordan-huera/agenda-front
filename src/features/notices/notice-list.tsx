import { BellOff, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTICE_PAGE_PATH, useMarkAllNoticesRead, useNoticeFeed, type NoticeScope } from "@/hooks/queries/use-notices";
import { NOTICE_LIST_SIZE } from "@/lib/constants/notices";
import { NoticeItem } from "./notice-item";
import { timeAgo } from "./notice-time";

/** Qué aparecerá en la campana, para quien todavía no tiene avisos. */
const EMPTY_NOTICES_HINT: Record<NoticeScope, string> = {
  business:
    "Aquí aparecerán las reservas online, los comprobantes de pago y las confirmaciones y cancelaciones de los pacientes en cuanto lleguen. No hace falta activar nada.",
  platform: "Aquí aparecerán los negocios nuevos, las solicitudes de cambio de plan y las alertas de seguridad de las cuentas de super admin.",
};

/** «No tienes avisos» y qué aparecerá ahí. */
export function NoticesEmpty({ scope, className }: { scope: NoticeScope; className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <BellOff className="size-5" aria-hidden />
        </span>
        <p className="font-medium">No tienes avisos</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{EMPTY_NOTICES_HINT[scope]}</p>
      </div>
    </div>
  );
}

interface NoticeListProps {
  scope: NoticeScope;
  /** La zona del negocio (en /admin, la de la plataforma): de ella sale «ayer». */
  timezone: string;
  unread: number;
  /** Cierra la lista (al abrir un aviso o «Ver todos»). */
  onClose: () => void;
}

/** La lista de la campana: los últimos 20, «Marcar todo como leído» y «Ver todos» (spec 014). */
export function NoticeList({ scope, timezone, unread, onClose }: NoticeListProps) {
  const feed = useNoticeFeed(scope, { limit: NOTICE_LIST_SIZE });
  const markAll = useMarkAllNoticesRead(scope);
  const notices = feed.data?.pages[0]?.notices ?? [];
  // «hace 5 min» desde que llegó la lista (se pide de nuevo cada vez que se abre).
  const now = new Date(feed.dataUpdatedAt);

  return (
    <div className="flex max-h-[min(36rem,calc(100dvh-5.5rem))] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="text-base font-semibold text-foreground">Avisos</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mr-2 text-primary"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          {markAll.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCheck aria-hidden />}
          Marcar todo como leído
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        {feed.isPending ? (
          <div className="space-y-2 p-2" role="status" aria-label="Cargando avisos">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : feed.isError ? (
          <div role="alert" className="px-4 py-6 text-center text-sm">
            <p className="font-medium">No pudimos cargar los avisos</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => feed.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : notices.length === 0 ? (
          <NoticesEmpty scope={scope} />
        ) : (
          <ol className="space-y-0.5" aria-label="Últimos avisos">
            {notices.map((notice) => (
              <NoticeItem key={notice.id} notice={notice} scope={scope} time={timeAgo(notice.createdAt, timezone, now)} onOpen={onClose} />
            ))}
          </ol>
        )}
      </div>

      <div className="shrink-0 border-t p-1.5">
        <Button asChild variant="ghost" className="w-full rounded-xl text-primary">
          <Link to={NOTICE_PAGE_PATH[scope]} onClick={onClose}>
            Ver todos
          </Link>
        </Button>
      </div>
    </div>
  );
}
