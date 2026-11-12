import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { WaitlistEntryInput } from "@/lib/validations/waitlist";
import { queryKeys } from "./query-keys";

/**
 * La lista de espera del panel (spec 047). Se pide sólo en los negocios que la tienen encendida (`enabled`); el
 * rol Profesional recibe sólo la de su agenda. Un minuto de caché: el botón de la Agenda lleva la cifra.
 */
export function useWaitlist(enabled: boolean) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.waitlist(businessId),
    queryFn: () => data.waitlist.list(businessId),
    enabled,
    staleTime: 60_000,
  });
}

/** «Anotar» desde el panel. */
export function useAddWaitlistEntry() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WaitlistEntryInput) => data.waitlist.add(businessId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.waitlist(businessId) }),
  });
}

/** «Quitar» o, al guardar su cita, «Agendar». */
export function useCloseWaitlistEntry() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: "removed" | "scheduled" }) => data.waitlist.close(businessId, entryId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.waitlist(businessId) }),
  });
}
