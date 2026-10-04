import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId, useSession } from "@/features/auth/use-session";
import { data, type UpdateBusinessInput } from "@/lib/data";
import type { ProfileInput } from "@/lib/validations/business";
import type { PlanId } from "@/types";
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
    mutationFn: (input: ProfileInput) => data.users.update(session!.userId, input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.user(user.id), user);
      queryClient.invalidateQueries({ queryKey: ["professional"] });
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

export function useProfessional() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.professional(businessId),
    queryFn: () => data.businesses.getProfessional(businessId),
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

export function usePendingPlanRequest() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.planRequest(businessId),
    queryFn: () => data.subscriptions.getPendingRequest(businessId),
  });
}

/** Solicitar o cancelar un cambio de plan: se recarga la solicitud y la auditoría. */
function usePlanRequestMutation<TVariables>(mutationFn: (businessId: string, variables: TVariables) => Promise<unknown>) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(businessId, variables),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.planRequest(businessId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(businessId) }),
      ]),
  });
}

export const useRequestPlanChange = () =>
  usePlanRequestMutation((businessId, plan: PlanId) => data.subscriptions.requestPlanChange(businessId, plan));

export const useCancelPlanRequest = () =>
  usePlanRequestMutation<void>((businessId) => data.subscriptions.cancelPlanRequest(businessId));
