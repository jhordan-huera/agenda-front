import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { BlockedTimeInput, ScheduleDayInput } from "@/lib/validations/schedule";
import type { Schedule } from "@/types";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useSchedules() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.schedules(businessId),
    queryFn: () => data.schedules.list(businessId),
  });
}

/** Guarda el horario de un profesional y reemplaza el suyo en la caché (el de los demás no cambia). */
export function useSaveSchedules() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: ({ professionalId, days }: { professionalId: string; days: ScheduleDayInput[] }) =>
      data.schedules.saveWeek(businessId, professionalId, days),
    onSuccess: (saved, { professionalId }) => {
      queryClient.setQueryData<Schedule[]>(queryKeys.schedules(businessId), (current = []) => [
        ...current.filter((schedule) => schedule.professionalId !== professionalId),
        ...saved,
      ]);
      return invalidateActivity();
    },
  });
}

export function useBlockedTimes() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.blockedTimes(businessId),
    queryFn: () => data.blockedTimes.list(businessId),
  });
}

export function useCreateBlockedTime() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (input: BlockedTimeInput) => data.blockedTimes.create(businessId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedTimes(businessId) });
      return invalidateActivity();
    },
  });
}

export function useDeleteBlockedTime() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (blockedTimeId: string) => data.blockedTimes.remove(businessId, blockedTimeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockedTimes(businessId) });
      return invalidateActivity();
    },
  });
}
