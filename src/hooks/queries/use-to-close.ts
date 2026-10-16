import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useSession } from "@/features/auth/use-session";
import { NOTICE_REFRESH_MS } from "@/lib/constants/notices";
import { data, DataError } from "@/lib/data";
import type { CloseAllInput } from "@/lib/validations/appointment";
import type { AppointmentsToClose, AppointmentsToCloseCount, AppointmentStatus } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

/**
 * Citas por cerrar (spec 018): el contador del panel, la lista «Por cerrar» y sus cierres.
 *
 * El contador se pide como el de la campana (spec 014, para no gastar la CPU de Vercel):
 * - al abrir el panel;
 * - al volver a la pestaña;
 * - cada 3 minutos, sólo con la pestaña visible (NOTICE_REFRESH_MS).
 *
 * Y cuando cambia cualquier cita (cuelga de "appointments"). Si la API todavía no tiene la lista (404, en
 * la ventana de publicación) o no es para esta cuenta (403: el rol Profesional sin agenda asignada), no
 * hay nada que cerrar: ni franja ni bloqueo, y no se vuelve a preguntar.
 */

/** La API no tiene la ruta (404) o no es para esta cuenta (403). */
const isUnavailable = (error: unknown) => error instanceof DataError && (error.code === "not_found" || error.code === "forbidden");

/** El negocio y la persona de la sesión: la lista de cada una es la suya. */
function useTarget() {
  const { session } = useSession();
  return { businessId: session?.businessId ?? "", userId: session?.userId ?? "" };
}

export interface ToCloseCount extends AppointmentsToCloseCount {
  /** Las de la lista: las de días anteriores más las de hoy que ya terminaron. */
  total: number;
  /** Ya respondió la API (antes, no se sabe si hay que bloquear el panel). */
  loaded: boolean;
  /** No hay lista para esta cuenta (ni franja ni bloqueo). */
  hidden: boolean;
}

/** El contador del panel: cuántas hay de días anteriores (bloquean) y de hoy (no bloquean). */
export function useToCloseCount(): ToCloseCount {
  const { businessId, userId } = useTarget();
  const enabled = Boolean(businessId && userId);
  const query = useQuery({
    queryKey: queryKeys.toClose.count(businessId, userId),
    queryFn: () => data.appointments.countToClose(businessId),
    enabled,
    staleTime: 30_000,
    // Con la pestaña visible (refetchIntervalInBackground: false) y nunca con la API sin la ruta.
    refetchInterval: (current) => (isUnavailable(current.state.error) ? false : NOTICE_REFRESH_MS),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (current) => (isUnavailable(current.state.error) ? false : "always"),
    retry: (count, error) => !isUnavailable(error) && count < 1,
  });
  const overdue = query.data?.overdue ?? 0;
  const today = query.data?.today ?? 0;
  return {
    overdue,
    today,
    total: overdue + today,
    // Si falló (p. ej. sin conexión), se sigue sin bloquear: el panel funciona igual.
    loaded: !enabled || query.data !== undefined || query.isError,
    hidden: !enabled || isUnavailable(query.error),
  };
}

/** La lista «Por cerrar», por tandas («Cargar más»). También pone al día el contador. */
export function useToCloseList(enabled = true) {
  const queryClient = useQueryClient();
  const { businessId, userId } = useTarget();
  return useInfiniteQuery({
    queryKey: queryKeys.toClose.list(businessId, userId),
    queryFn: async ({ pageParam }) => {
      const page = await data.appointments.listToClose(businessId, pageParam);
      queryClient.setQueryData<AppointmentsToCloseCount>(queryKeys.toClose.count(businessId, userId), {
        overdue: page.overdue,
        today: page.today,
      });
      return page;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: enabled && Boolean(businessId && userId),
    staleTime: 0,
    retry: (count, error) => !isUnavailable(error) && count < 1,
  });
}

/** Lo que cambia en pantalla al cerrar: las citas salen de la lista y bajan las cifras, antes de recargar. */
function useRemoveFromCache() {
  const queryClient = useQueryClient();
  const { businessId, userId } = useTarget();
  const invalidateActivity = useInvalidateActivity();
  return {
    remove(ids: readonly string[]) {
      const gone = new Set(ids);
      let overdue = 0;
      let today = 0;
      queryClient.setQueryData<InfiniteData<AppointmentsToClose>>(queryKeys.toClose.list(businessId, userId), (list) => {
        if (!list) return list;
        for (const page of list.pages) {
          for (const item of page.appointments) {
            if (!gone.has(item.id)) continue;
            if (item.overdue) overdue++;
            else today++;
          }
        }
        return {
          ...list,
          pages: list.pages.map((page) => ({
            ...page,
            appointments: page.appointments.filter((item) => !gone.has(item.id)),
            overdue: Math.max(0, page.overdue - overdue),
            today: Math.max(0, page.today - today),
          })),
        };
      });
      queryClient.setQueryData<AppointmentsToCloseCount>(queryKeys.toClose.count(businessId, userId), (current) =>
        current ? { overdue: Math.max(0, current.overdue - overdue), today: Math.max(0, current.today - today) } : current,
      );
    },
    /** La agenda, la lista, el contador y la actividad, como tras cualquier cambio de una cita. */
    refresh: () =>
      Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) }), invalidateActivity()]),
  };
}

/**
 * Cerrar una cita desde la lista: la ruta de siempre (PATCH …/status, spec 008) con `onlyIfOpen`. Si otra
 * persona ya la cerró, la API responde `conflict`, su estado se respeta y la lista se recarga.
 */
export function useCloseAppointment() {
  const businessId = useTarget().businessId;
  const cache = useRemoveFromCache();
  return useMutation({
    mutationFn: ({ id, status, notify }: { id: string; status: AppointmentStatus; notify: boolean }) =>
      data.appointments.updateStatus(businessId, id, status, notify, { onlyIfOpen: true }),
    onSuccess: (_appointment, { id }) => {
      cache.remove([id]);
      void cache.refresh();
    },
    onError: () => void cache.refresh(),
  });
}

/** «Marcar todas como completadas»: las que se ven en la lista, de una vez. */
export function useCloseAllAppointments() {
  const businessId = useTarget().businessId;
  const cache = useRemoveFromCache();
  return useMutation({
    mutationFn: (input: CloseAllInput) => data.appointments.closeAll(businessId, input),
    onSuccess: (_result, { ids }) => {
      cache.remove(ids);
      void cache.refresh();
    },
    onError: () => void cache.refresh(),
  });
}
