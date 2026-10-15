import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useSession } from "@/features/auth/use-session";
import { NOTICE_REFRESH_MS } from "@/lib/constants/notices";
import { data, DataError, type NoticeListFilters, type NoticeRepository } from "@/lib/data";
import type { PanelNoticePage } from "@/types";
import { queryKeys } from "./query-keys";

/**
 * Centro de avisos del panel (spec 014): la campana del negocio y la de /admin.
 *
 * El contador se pide (R6, para no gastar la CPU de Vercel):
 * - al abrir el panel;
 * - al volver a la pestaña;
 * - cada 3 minutos, sólo con la pestaña visible (NOTICE_REFRESH_MS);
 * - al instante, cuando el service worker recibe un aviso al celular en este navegador
 *   (`agenda360:aviso`, src/sw.ts).
 *
 * La lista (con los textos) sólo se pide al abrir la campana o la página «Avisos». Si la API todavía no
 * tiene avisos (404, en la ventana de publicación) o no son para esta cuenta (403), la campana no se
 * muestra, no da error y no se vuelve a preguntar.
 */

/** La del negocio de la sesión o la de /admin. */
export type NoticeScope = "business" | "platform";

/** La página «Avisos» de cada campana. */
export const NOTICE_PAGE_PATH: Record<NoticeScope, string> = { business: "/dashboard/notices", platform: "/admin/notices" };

/** La API no tiene la ruta (404) o no es para esta cuenta (403): sin campana. */
export const isNoticesUnavailable = (error: unknown) =>
  error instanceof DataError && (error.code === "not_found" || error.code === "forbidden");

const unavailable = (query: { state: { error: unknown } }) => isNoticesUnavailable(query.state.error);

/** Quién lee y dónde: las claves de caché y las rutas de esa campana. */
function useNoticeTarget(scope: NoticeScope): { userId: string; key: string; repository: NoticeRepository; enabled: boolean } {
  const { session } = useSession();
  const userId = session?.userId ?? "";
  const businessId = session?.businessId ?? "";
  // El super admin en modo soporte no tiene la campana del negocio: es del equipo (la API responde 403).
  const enabled = Boolean(userId) && (scope === "platform" ? session?.platformRole === "super_admin" : Boolean(businessId) && !session?.support);
  const key = scope === "platform" ? "admin" : businessId;
  const repository = useMemo(() => (scope === "platform" ? data.notices.platform : data.notices.business(businessId)), [scope, businessId]);
  return { userId, key, repository, enabled };
}

/** Un aviso nuevo en el celular de este navegador: se recargan el contador y la lista abierta (R11). */
function useServiceWorkerNotices(userId: string, key: string, enabled: boolean): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: unknown } | null)?.type !== "agenda360:aviso") return;
      // Las dos campanas (menú lateral y barra del celular) escuchan: sin repetir la petición en curso.
      void queryClient.invalidateQueries({ queryKey: queryKeys.notices.all(userId, key) }, { cancelRefetch: false });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [enabled, queryClient, userId, key]);
}

/** El número de la campana. `hidden`: la API no tiene la campana para esta cuenta (no se muestra). */
export function useUnreadNotices(scope: NoticeScope) {
  const { userId, key, repository, enabled } = useNoticeTarget(scope);
  useServiceWorkerNotices(userId, key, enabled);
  const query = useQuery({
    queryKey: queryKeys.notices.unread(userId, key),
    queryFn: () => repository.unread(),
    enabled,
    staleTime: 30_000,
    // Con la pestaña visible (refetchIntervalInBackground: false) y nunca con la API sin la ruta.
    refetchInterval: (current) => (unavailable(current) ? false : NOTICE_REFRESH_MS),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (current) => (unavailable(current) ? false : "always"),
    retry: (count, error) => !isNoticesUnavailable(error) && count < 1,
  });
  return {
    unread: query.data?.unread ?? 0,
    hidden: !enabled || isNoticesUnavailable(query.error),
    loaded: query.data !== undefined,
  };
}

/** Los avisos de la campana o de la página, con «Cargar más». También pone al día el contador. */
export function useNoticeFeed(scope: NoticeScope, filters: Omit<NoticeListFilters, "cursor">, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { userId, key, repository, enabled } = useNoticeTarget(scope);
  return useInfiniteQuery({
    queryKey: queryKeys.notices.feed(userId, key, filters),
    queryFn: async ({ pageParam }) => {
      const page = await repository.list({ ...filters, cursor: pageParam });
      queryClient.setQueryData(queryKeys.notices.unread(userId, key), { unread: page.unread });
      return page;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: enabled && (options.enabled ?? true),
    staleTime: 0,
    retry: (count, error) => !isNoticesUnavailable(error) && count < 1,
  });
}

/** Lo que cambia en la caché al leer: el aviso queda leído en todas las listas y el número baja. */
function useMarkInCache(scope: NoticeScope) {
  const queryClient = useQueryClient();
  const target = useNoticeTarget(scope);
  const { userId, key } = target;
  return {
    target,
    /** Marca leídos (todos con `ids` null) y devuelve cuántos sin leer había entre ellos. */
    apply(ids: string[] | null): number {
      let changed = 0;
      const seen = new Set<string>();
      queryClient.setQueriesData<InfiniteData<PanelNoticePage>>({ queryKey: [...queryKeys.notices.all(userId, key), "feed"] }, (feed) =>
        feed
          ? {
              ...feed,
              pages: feed.pages.map((page) => ({
                ...page,
                notices: page.notices.map((notice) => {
                  if (notice.read || (ids && !ids.includes(notice.id))) return notice;
                  if (!seen.has(notice.id)) {
                    seen.add(notice.id);
                    changed++;
                  }
                  return { ...notice, read: true };
                }),
              })),
            }
          : feed,
      );
      queryClient.setQueryData<{ unread: number }>(queryKeys.notices.unread(userId, key), (current) =>
        current ? { unread: ids ? Math.max(0, current.unread - changed) : 0 } : current,
      );
      return changed;
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.notices.all(userId, key) }),
    /** Sólo las listas abiertas (p. ej. «Sólo los no leídos» queda vacía): el número ya está bien. */
    refreshLists: () => queryClient.invalidateQueries({ queryKey: [...queryKeys.notices.all(userId, key), "feed"] }),
  };
}

/** Al tocar un aviso: queda leído al momento (en pantalla) y se guarda en la API. */
export function useMarkNoticeRead(scope: NoticeScope) {
  const cache = useMarkInCache(scope);
  return useMutation({
    mutationFn: (noticeId: string) => cache.target.repository.markRead(noticeId),
    onMutate: (noticeId) => {
      cache.apply([noticeId]);
    },
    // La caché ya quedó como en la API. Si falló (p. ej. sin conexión), se vuelve a lo que diga la API.
    onError: () => void cache.refresh(),
  });
}

/** «Marcar todo como leído»: la campana queda sin número. */
export function useMarkAllNoticesRead(scope: NoticeScope) {
  const cache = useMarkInCache(scope);
  return useMutation({
    mutationFn: () => cache.target.repository.markAllRead(),
    onMutate: () => {
      cache.apply(null);
    },
    onSuccess: () => void cache.refreshLists(),
    onError: () => void cache.refresh(),
  });
}
