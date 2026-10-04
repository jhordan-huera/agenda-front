import { useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { queryKeys } from "./query-keys";

/** Tras una mutación cambian el uso del plan, la auditoría y la bandeja de emails. */
export function useInvalidateActivity() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.usage(businessId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(businessId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(businessId) }),
    ]);
}
