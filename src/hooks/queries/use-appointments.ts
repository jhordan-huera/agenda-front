import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOfferWhatsAppNotice } from "@/features/appointments/whatsapp-notice-context";
import { useBusinessId } from "@/features/auth/use-session";
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
    for (const [, list] of queryClient.getQueriesData<unknown>({ queryKey: queryKeys.appointments(businessId) })) {
      const found = Array.isArray(list) ? (list as Appointment[]).find((appointment) => appointment.id === id) : undefined;
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
    mutationFn: ({ id, input }: { id?: string; input: AppointmentInput }) =>
      id
        ? data.appointments.update(businessId, id, input)
        : data.appointments.create(businessId, input),
    onMutate: ({ id }) => ({ previous: id ? findCached(id) : undefined }),
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
