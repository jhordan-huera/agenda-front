import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId, useSession } from "@/features/auth/use-session";
import { data, type UpdateBusinessInput } from "@/lib/data";
import type { ProfileInput } from "@/lib/validations/business";
import { queryKeys } from "./query-keys";

export function useCurrentUser() {
  const { session } = useSession();
  const userId = session?.userId ?? "";
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => data.users.getById(userId),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    /** `currentPassword`: obligatoria si cambia el email (con el que se inicia sesión). */
    mutationFn: (input: ProfileInput & { currentPassword?: string }) => data.users.update(session!.userId, input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.user(user.id), user);
      // Su nombre y su foto son los de su agenda: también cambian en la lista de profesionales y en la página pública.
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    },
  });
}

export function useCurrentBusiness() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.business(businessId),
    queryFn: () => data.businesses.getById(businessId),
  });
}

export function useUpdateBusiness() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessInput) => data.businesses.update(businessId, input),
    onSuccess: (business) => {
      queryClient.setQueryData(queryKeys.business(businessId), business);
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(businessId) });
    },
  });
}

export function useSubscription() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.subscription(businessId),
    queryFn: () => data.subscriptions.get(businessId),
  });
}

/** Uso actual frente a los límites del plan (citas del mes, clientes, usuarios). */
export function usePlanUsage() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.usage(businessId),
    queryFn: () => data.subscriptions.getUsage(businessId),
  });
}


