import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { ClientInput } from "@/lib/validations/client";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useClients() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clients(businessId),
    queryFn: () => data.clients.list(businessId),
  });
}

export function useClient(clientId: string) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.client(businessId, clientId),
    queryFn: () => data.clients.getById(businessId, clientId),
  });
}

export function useSaveClient() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ClientInput }) =>
      id ? data.clients.update(businessId, id, input) : data.clients.create(businessId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) });
      return invalidateActivity();
    },
  });
}

export function useDeleteClient() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (clientId: string) => data.clients.remove(businessId, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) });
      return invalidateActivity();
    },
  });
}
