import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import { queryKeys } from "./query-keys";

/**
 * Los controles (spec 051): sin `clientId`, la hoja «Controles» de la Agenda (los vencidos y los de los próximos 30
 * días); con él, los de ese paciente (su ficha). El rol Profesional recibe sólo los de su agenda. Un minuto de caché:
 * el botón de la Agenda lleva la cifra; guardar una cita los vuelve a pedir.
 */
export function useControlReminders(enabled: boolean, clientId?: string) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.controlReminders(businessId, clientId),
    queryFn: () => data.controlReminders.list(businessId, clientId),
    enabled,
    staleTime: 60_000,
  });
}

/** «Quitar»: ese control sale de la hoja y de la ficha, y no se le escribe. */
export function useRemoveControlReminder() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => data.controlReminders.remove(businessId, appointmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["control-reminders", businessId] }),
  });
}
