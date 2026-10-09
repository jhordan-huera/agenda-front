import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { BusinessRole } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useTeam() {
  const businessId = useBusinessId();
  return useQuery({ queryKey: queryKeys.team(businessId), queryFn: () => data.team.list(businessId) });
}

function useTeamMutation<TVariables, TResult>(mutationFn: (businessId: string, variables: TVariables) => Promise<TResult>) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(businessId, variables),
    // Sin esperar las recargas: el diálogo se cierra al responder la API.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.team(businessId) });
      void invalidateActivity();
    },
  });
}

export const useUpdateMemberRole = () =>
  useTeamMutation((businessId, { userId, role }: { userId: string; role: Exclude<BusinessRole, "owner"> }) =>
    data.team.updateRole(businessId, userId, role),
  );

export const useRemoveMember = () => useTeamMutation((businessId, userId: string) => data.team.remove(businessId, userId));

export const useSetClinicalAccess = () =>
  useTeamMutation((businessId, { userId, access }: { userId: string; access: boolean }) =>
    data.team.setClinicalAccess(businessId, userId, access),
  );
