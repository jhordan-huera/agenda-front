import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { ClinicalAddendumInput, ClinicalNoteInput, ClinicalProfileInput } from "@/lib/validations/clinical";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useClinicalRecord(clientId: string, enabled = true) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clinicalRecord(businessId, clientId),
    queryFn: () => data.clinicalRecords.get(businessId, clientId),
    enabled,
  });
}

/** Tras escribir, se recarga la historia y la auditoría (que registra cada cambio). */
function useClinicalMutation<TVariables, TResult>(
  clientId: string,
  mutationFn: (businessId: string, variables: TVariables) => Promise<TResult>,
) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(businessId, variables),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.clinicalRecord(businessId, clientId) }),
        invalidateActivity(),
      ]),
  });
}

export const useSaveClinicalProfile = (clientId: string) =>
  useClinicalMutation(clientId, (businessId, input: ClinicalProfileInput) =>
    data.clinicalRecords.saveProfile(businessId, clientId, input),
  );

export const useAddClinicalNote = (clientId: string) =>
  useClinicalMutation(clientId, (businessId, input: ClinicalNoteInput) =>
    data.clinicalRecords.addNote(businessId, clientId, input),
  );

export const useAddClinicalAddendum = (clientId: string) =>
  useClinicalMutation(clientId, (businessId, { noteId, input }: { noteId: string; input: ClinicalAddendumInput }) =>
    data.clinicalRecords.addAddendum(businessId, noteId, input),
  );
