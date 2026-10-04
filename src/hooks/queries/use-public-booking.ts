import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import type { PublicBookingInput } from "@/lib/validations/booking";
import { queryKeys } from "./query-keys";

export function usePublicProfile(slug: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(slug),
    queryFn: () => data.publicBooking.getProfile(slug),
  });
}

export function useCreateBooking(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublicBookingInput) => data.publicBooking.book(slug, input),
    // Tanto si se reserva como si la hora se ocupó, se recarga la disponibilidad.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.publicProfile(slug) }),
  });
}

/** Busca la cédula entre los clientes del negocio (paso "Tus datos" de la reserva). */
export function useLookupClient(slug: string) {
  return useMutation({ mutationFn: (documentId: string) => data.publicBooking.lookupClient(slug, documentId) });
}
