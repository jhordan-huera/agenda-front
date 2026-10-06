import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { ProfessionalInput } from "@/lib/validations/professional";
import type { Professional } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

/** Todas las agendas del negocio (activas e inactivas), en su orden. */
export function useProfessionals() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.professionals(businessId),
    queryFn: () => data.professionals.list(businessId),
    staleTime: 5 * 60_000,
  });
}

/** Sólo las activas: las que reciben citas. */
export function useActiveProfessionals(): Professional[] {
  return (useProfessionals().data ?? []).filter((professional) => professional.isActive);
}

/**
 * Al cambiar un profesional cambian el horario (una agenda nueva trae el suyo), el uso del plan, la
 * sesión (si se le asignó a alguien) y la página de reservas.
 */
function useInvalidateProfessionals() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.professionals(businessId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules(businessId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.usage(businessId) }),
      queryClient.invalidateQueries({ queryKey: ["public-profile"] }),
      invalidateActivity(),
    ]);
}

export function useSaveProfessional() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateProfessionals();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ProfessionalInput }) =>
      id ? data.professionals.update(businessId, id, input) : data.professionals.create(businessId, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProfessional() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateProfessionals();
  return useMutation({
    mutationFn: (professionalId: string) => data.professionals.remove(businessId, professionalId),
    onSuccess: () => invalidate(),
  });
}
