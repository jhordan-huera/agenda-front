import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessId } from "@/features/auth/use-session";
import { data } from "@/lib/data";
import type { BlockedTimeInput, ScheduleDayInput } from "@/lib/validations/schedule";
import { queryKeys } from "./query-keys";
import { useInvalidateActivity } from "./use-invalidate-activity";

export function useSchedules() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.schedules(businessId),
    queryFn: () => data.schedules.list(businessId),
  });
}

export function useSaveSchedules() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const invalidateActivity = useInvalidateActivity();
  return useMutation({
    mutationFn: (days: ScheduleDayInput[]) => data.schedules.saveWeek(businessId, days),
    onSuccess: (schedules) => {
      queryClient.setQueryData(queryKeys.schedules(businessId), schedules);
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
