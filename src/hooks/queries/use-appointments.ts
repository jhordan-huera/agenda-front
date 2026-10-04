import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data, type AppointmentFilters } from "@/lib/data";
import type { AppointmentInput } from "@/lib/validations/appointment";
import type { AppointmentStatus } from "@/types";
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

export function useSaveAppointment() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AppointmentInput }) =>
      id
        ? data.appointments.update(businessId, id, input)
        : data.appointments.create(businessId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateAppointmentStatus() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateAppointments();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      data.appointments.updateStatus(businessId, id, status),
    onSuccess: invalidate,
  });
}
