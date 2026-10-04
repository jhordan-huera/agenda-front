import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { ServiceInput } from "@/lib/validations/service";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useServices() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.services(businessId),
    queryFn: () => data.services.list(businessId),
  });
}

export function useSaveService() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ServiceInput }) =>
      id ? data.services.update(businessId, id, input) : data.services.create(businessId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(businessId) });
      return invalidateActivity();
    },
  });
}

export function useDeleteService() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (serviceId: string) => data.services.remove(businessId, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(businessId) });
      return invalidateActivity();
    },
  });
}
