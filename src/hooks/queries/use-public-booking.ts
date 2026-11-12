import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data } from "@/lib/data";
import type { PublicBookingInput } from "@/lib/validations/booking";
import type { SurveyAnswerInput } from "@/lib/validations/survey";
import type { PublicWaitlistInput } from "@/lib/validations/waitlist";
import type { ReceiptInput } from "@/lib/validations/payment";
import type { PublicAppointmentResult } from "@/types";
import { prepareReceipt, uploadToStorage } from "@/lib/upload";
import { queryKeys } from "./query-keys";

/** `fresh`: sin la copia guardada (ver getProfile), al llegar desde «Reservar esta hora». */
export function usePublicProfile(slug: string, fresh = false) {
  return useQuery({
    queryKey: queryKeys.publicProfile(slug),
    queryFn: () => data.publicBooking.getProfile(slug, fresh),
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

/** Página «Tu cita» de una cita (/cita/:token, spec 010). */
export function usePublicAppointment(token: string) {
  return useQuery({
    queryKey: queryKeys.publicAppointment(token),
    queryFn: () => data.publicBooking.getAppointment(token),
    retry: false,
  });
}

/** Al confirmar o cancelar, la respuesta ya trae la cita como queda: la página se actualiza sin pedirla otra vez. */
function useAppointmentAction(token: string, action: (token: string) => Promise<PublicAppointmentResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => action(token),
    onSuccess: (result) => queryClient.setQueryData(queryKeys.publicAppointment(token), result.appointment),
  });
}

/** «Confirmo que voy». */
export const useConfirmAppointment = (token: string) => useAppointmentAction(token, data.publicBooking.confirmAppointment);

/** «Cancelar mi cita». */
export const useCancelAppointment = (token: string) => useAppointmentAction(token, data.publicBooking.cancelAppointment);

/** Lista de espera (spec 047): anotarse desde la página de reservas, con el CAPTCHA de la reserva. */
export function useJoinWaitlist(slug: string, getCaptchaToken: GetCaptchaToken) {
  return useMutation({
    mutationFn: async (input: PublicWaitlistInput) => data.publicBooking.joinWaitlist(slug, input, await getCaptchaToken()),
  });
}

/** El enlace personal de quien espera (/lista-de-espera/:token). */
export function usePublicWaitlist(token: string | null) {
  return useQuery({
    queryKey: queryKeys.publicWaitlist(token ?? ""),
    queryFn: () => data.publicBooking.getWaitlistEntry(token!),
    enabled: Boolean(token),
    retry: false,
  });
}

/** «Salir de la lista» desde el enlace de los emails. */
export function useLeaveWaitlist(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => data.publicBooking.leaveWaitlist(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.publicWaitlist(token) }),
  });
}

/** La encuesta después de la cita (spec 048), en /encuesta/:token. */
export function usePublicSurvey(token: string) {
  return useQuery({
    queryKey: queryKeys.publicSurvey(token),
    queryFn: () => data.publicBooking.getSurvey(token),
    retry: false,
  });
}

/** Responder la encuesta: la página pasa a «Gracias por contarnos». */
export function useAnswerSurvey(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SurveyAnswerInput) => data.publicBooking.answerSurvey(token, input),
    onSuccess: (survey) => queryClient.setQueryData(queryKeys.publicSurvey(token), survey),
  });
}

/** «No quiero recibir estas encuestas». */
export function useSurveyOptOut(token: string) {
  return useMutation({ mutationFn: () => data.publicBooking.surveyOptOut(token) });
}
