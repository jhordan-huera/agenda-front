import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import type { PublicBookingInput } from "@/lib/validations/booking";
import type { ReceiptInput } from "@/lib/validations/payment";
import { prepareReceipt, uploadToStorage } from "@/lib/upload";
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

/** Site Key del CAPTCHA del registro (la de la reserva viene en el perfil del negocio). */
export function useCaptchaSiteKey() {
  return useQuery({
    queryKey: queryKeys.captchaSiteKey,
    queryFn: () => data.publicBooking.getCaptchaSiteKey(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Enlace de pago de una cita (/pago/:token). */
export function usePublicPayment(token: string) {
  return useQuery({
    queryKey: queryKeys.publicPayment(token),
    queryFn: () => data.publicBooking.getPayment(token),
    retry: false,
  });
}

/**
 * El paciente sube el comprobante: se reduce si es una foto, se pide la URL firmada, el navegador
 * envía el archivo directo al almacenamiento (con progreso) y la API confirma que llegó y avisa al negocio.
 */
export function useUploadReceipt(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) => {
      // Las fotos se reducen antes de subirlas: así el almacenamiento dura mucho más.
      const { body, contentType, fileName } = await prepareReceipt(file);
      const input = { fileName, contentType, sizeBytes: body.size } as ReceiptInput;
      const { receipt, upload } = await data.publicBooking.requestReceiptUpload(token, input);
      await uploadToStorage(upload, body, { contentType, onProgress });
      return data.publicBooking.completeReceiptUpload(token, receipt.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.publicPayment(token) }),
  });
}
