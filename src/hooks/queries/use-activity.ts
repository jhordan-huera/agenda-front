import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useBusinessId } from "@/features/auth/use-session";
import { data, type AuditLogFilters } from "@/lib/data";
import { queryKeys } from "./query-keys";

export function useEmailOutbox() {
  const businessId = useBusinessId();
  return useQuery({ queryKey: queryKeys.notifications(businessId), queryFn: () => data.notifications.list(businessId) });
}

export function useAuditLogs(filters: AuditLogFilters = {}, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: [...queryKeys.auditLogs(businessId), filters],
    queryFn: () => data.auditLogs.list(businessId, filters),
    enabled,
  });
}

const REMINDER_INTERVAL_MS = 5 * 60_000;

/**
 * Pide a la API los recordatorios pendientes al abrir el panel y cada 5 minutos.
 * La API también los envía sola periódicamente, aunque nadie tenga la app abierta.
 */
export function useReminderJob() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => data.notifications.runReminderJob(businessId),
    onSuccess: (sent) => {
      if (sent > 0) queryClient.invalidateQueries({ queryKey: queryKeys.notifications(businessId) });
    },
  });

  useEffect(() => {
    mutate();
    const interval = setInterval(() => mutate(), REMINDER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mutate]);
}
