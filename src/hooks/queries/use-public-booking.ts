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

/** Token del CAPTCHA para cada petición (undefined si el negocio no lo pide). Ver useCaptcha. */
type GetCaptchaToken = () => Promise<string | undefined>;

export function useCreateBooking(slug: string, getCaptchaToken: GetCaptchaToken) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublicBookingInput) => data.publicBooking.book(slug, input, await getCaptchaToken()),
    // Tanto si se reserva como si la hora se ocupó, se recarga la disponibilidad.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.publicProfile(slug) }),
  });
}

/** Busca la cédula entre los clientes del negocio (paso "Tus datos" de la reserva). */
export function useLookupClient(slug: string, getCaptchaToken: GetCaptchaToken) {
  return useMutation({
    mutationFn: async (documentId: string) => data.publicBooking.lookupClient(slug, documentId, await getCaptchaToken()),
  });
}
