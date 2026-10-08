import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appointmentToInput } from "@/features/appointments/appointment-utils";
import { useOfferWhatsAppNotice } from "@/features/appointments/whatsapp-notice-context";
import { useBusinessId } from "@/features/auth/use-session";
import { useErrorToast } from "@/hooks/use-error-toast";
import { data, type AppointmentFilters } from "@/lib/data";
import type { AppointmentInput } from "@/lib/validations/appointment";
import { noticeForStatus } from "@/lib/whatsapp";
import type { Appointment, AppointmentStatus } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useAppointments(filters: AppointmentFilters = {}, options: { keepPrevious?: boolean } = {}) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.appointmentList(businessId, filters),
    queryFn: () => data.appointments.list(businessId, filters),
    // Al navegar por la agenda se mantiene el rango anterior mientras carga el nuevo.
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
}

/**
 * Una cita por su id: sale al momento de la agenda ya cargada (si está) y se pide a la API sólo
 * si no está, sin descargar todas las citas.
 */
export function useAppointment(appointmentId: string | null | undefined) {
  const businessId = useBusinessId();
  const findCached = useCachedAppointment();
  return useQuery({
    queryKey: queryKeys.appointment(businessId, appointmentId ?? ""),
    queryFn: () => data.appointments.getById(businessId, appointmentId!),
    enabled: Boolean(appointmentId),
    placeholderData: () => (appointmentId ? findCached(appointmentId) : undefined),
  });
}

/** Resumen de las citas de cada cliente (totales, última y próxima cita), calculado en la API. */
export function useClientActivity() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clientActivity(businessId),
    queryFn: () => data.clients.activity(businessId),
  });
}

function useInvalidateAppointments() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) }), invalidateActivity()]);
}

/** La cita tal como está en la caché de la agenda: para saber qué cambió al guardarla. */
function useCachedAppointment() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return (id: string): Appointment | undefined => {
    for (const [, cached] of queryClient.getQueriesData<unknown>({ queryKey: queryKeys.appointments(businessId) })) {
      // Listas de la agenda o una cita suelta (useAppointment).
      const found = Array.isArray(cached)
        ? (cached as Appointment[]).find((appointment) => appointment?.id === id)
        : (cached as Appointment | null | undefined)?.id === id
          ? (cached as Appointment)
          : undefined;
      if (found) return found;
    }
    return undefined;
  };
}

export function useSaveAppointment() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateAppointments();
  const findCached = useCachedAppointment();
  const offerWhatsApp = useOfferWhatsAppNotice();
  return useMutation({
    // `previous`: la cita antes del cambio, si la caché ya muestra la nueva (citas movidas en la agenda).
    mutationFn: ({ id, input }: { id?: string; input: AppointmentInput; previous?: Appointment }) =>
      id
        ? data.appointments.update(businessId, id, input)
        : data.appointments.create(businessId, input),
    onMutate: ({ id, previous }) => ({ previous: previous ?? (id ? findCached(id) : undefined) }),
    onSuccess: (saved, _variables, context) => {
      // Al editar: si cambió el estado, el aviso de ese estado; si cambió la fecha, la hora o el
      // servicio, el de "reprogramada".
      const previous = context?.previous;
      if (previous && previous.status !== saved.status) offerWhatsApp(saved, noticeForStatus(saved.status));
      else if (
        previous &&
        saved.status !== "cancelled" &&
        (previous.date !== saved.date || previous.startTime !== saved.startTime || previous.serviceId !== saved.serviceId)
      ) {
        offerWhatsApp(saved, "rescheduled");
      }
      return invalidate();
    },
  });
}

/** Segundos para deshacer una cita movida en la agenda, antes de guardarla. */
const UNDO_MS = 5000;

/** La caché con una cita cambiada: en las listas de la agenda y en la cita suelta. */
function replaceAppointment(cached: unknown, appointment: Appointment): unknown {
  if (Array.isArray(cached)) {
    return cached.map((item) => (item?.id === appointment.id && "startTime" in item ? appointment : item));
  }
  const single = cached as Partial<Appointment> | null | undefined;
  return single?.id === appointment.id && "startTime" in single ? appointment : cached;
}

/**
 * Mover una cita arrastrándola: la agenda la muestra al momento en su nuevo sitio, pero se guarda
 * pasados unos segundos. Así "Deshacer" no llega a avisar al paciente (ni le envía dos emails).
 */
export function useMoveAppointment() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const save = useSaveAppointment();
  const showError = useErrorToast();
  const show = (appointment: Appointment) =>
    queryClient.setQueriesData({ queryKey: queryKeys.appointments(businessId) }, (cached: unknown) =>
      replaceAppointment(cached, appointment),
    );
  return async (appointment: Appointment, moved: Appointment, message: string) => {
    // Que una recarga en curso no la devuelva a su sitio mientras tanto.
    await queryClient.cancelQueries({ queryKey: queryKeys.appointments(businessId) });
    show(moved);
    const timer = setTimeout(() => {
      save.mutateAsync({ id: appointment.id, input: appointmentToInput(moved), previous: appointment }).catch((error: unknown) => {
        show(appointment);
        void queryClient.invalidateQueries({ queryKey: queryKeys.appointments(businessId) });
        showError(error);
      });
    }, UNDO_MS);
    toast.success(message, {
      duration: UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          clearTimeout(timer);
          show(appointment);
        },
      },
    });
  };
}

/** Llegada del paciente: recepción la marca al verlo en la sala de espera. */
export function useSetAppointmentArrival() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: ({ id, arrived }: { id: string; arrived: boolean }) => data.appointments.setArrival(businessId, id, arrived),
    onSuccess: () => invalidate(),
  });
}

/** Marca la cita como pagada (o lo deshace). */
export function useSetAppointmentPaid() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => data.appointments.setPaid(businessId, id, paid),
    onSuccess: () => invalidate(),
  });
}

/** Comprobantes de pago que envió el paciente (sólo si la cita tiene alguno). */
export function useAppointmentReceipts(appointment: Pick<Appointment, "id" | "receiptAt"> | null | undefined) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.receipts(businessId, appointment?.id ?? ""),
    queryFn: () => data.appointments.listReceipts(businessId, appointment!.id),
    enabled: Boolean(appointment?.receiptAt),
  });
}

/** Abre un comprobante (URL firmada de unos minutos) en otra pestaña. */
export async function openPaymentReceipt(businessId: string, receiptId: string): Promise<void> {
  // La pestaña se abre antes de esperar a la API: si no, el navegador la bloquea como emergente.
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  try {
    const { url } = await data.appointments.getReceiptUrl(businessId, receiptId);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export function useUpdateAppointmentStatus() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateAppointments();
  const offerWhatsApp = useOfferWhatsAppNotice();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      data.appointments.updateStatus(businessId, id, status),
    onSuccess: (appointment, { status }) => {
      offerWhatsApp(appointment, noticeForStatus(status));
      return invalidate();
    },
  });
}
