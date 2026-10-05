import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data, type AuditLogFilters } from "@/lib/data";
import { queryKeys } from "./query-keys";

export function useEmailOutbox() {
  const businessId = useBusinessId();
  return useQuery({ queryKey: queryKeys.notifications(businessId), queryFn: () => data.notifications.list(businessId) });
}

/** Una página de la actividad (p. ej. el historial del plan). */
export function useAuditLogs(filters: AuditLogFilters = {}, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: [...queryKeys.auditLogs(businessId), filters],
    queryFn: () => data.auditLogs.list(businessId, filters),
    enabled,
  });
}

/** Actividad del negocio con "Cargar más". */
export function useAuditFeed(filters: Omit<AuditLogFilters, "cursor">) {
  const businessId = useBusinessId();
  return useInfiniteQuery({
    queryKey: [...queryKeys.auditLogs(businessId), "feed", filters],
    queryFn: ({ pageParam }) => data.auditLogs.list(businessId, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
