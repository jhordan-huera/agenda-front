import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, type AdminAuditScope } from "@/lib/data";
import type {
  AdminBusinessInput,
  AdminMemberInput,
  BusinessCategoryInput,
  PlatformSettingsInput,
} from "@/lib/validations/admin";
import type { BusinessStatus, PlanId } from "@/types";
import { queryKeys } from "./query-keys";

/* Panel del super admin. El backend vuelve a comprobar el rol en cada llamada. */

export const useAdminStats = () => useQuery({ queryKey: queryKeys.admin.stats, queryFn: () => data.admin.getStats() });

export const useAdminBusinesses = () =>
  useQuery({ queryKey: queryKeys.admin.businesses, queryFn: () => data.admin.listBusinesses() });

export const useAdminBusiness = (businessId: string) =>
  useQuery({ queryKey: queryKeys.admin.business(businessId), queryFn: () => data.admin.getBusiness(businessId) });

export const useAdminCategories = () =>
  useQuery({ queryKey: queryKeys.admin.categories, queryFn: () => data.admin.listCategories() });

/** Crear o editar una categoría: también se recarga la lista pública que usan los formularios. */
export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BusinessCategoryInput }) =>
      id ? data.admin.updateCategory(id, input) : data.admin.createCategory(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      ]),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => data.admin.deleteCategory(categoryId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      ]),
  });
}

export const useAdminPlanRequests = () =>
  useQuery({ queryKey: queryKeys.admin.planRequests, queryFn: () => data.admin.listPlanRequests() });

export const useAdminUsers = () => useQuery({ queryKey: queryKeys.admin.users, queryFn: () => data.admin.listUsers() });

export const useAdminAuditLogs = (scope: AdminAuditScope) =>
  useQuery({ queryKey: queryKeys.admin.auditLogs(scope), queryFn: () => data.admin.listAuditLogs(scope) });

export const useAdminEmails = () => useQuery({ queryKey: queryKeys.admin.emails, queryFn: () => data.admin.listEmails() });

/** Pública: la usan el registro y la pantalla de negocio suspendido. */
export const usePlatformSettings = () =>
  useQuery({ queryKey: queryKeys.platformSettings, queryFn: () => data.platform.getSettings() });

/** Toda mutación de plataforma cambia métricas, listados y auditoría: se invalida el panel entero. */
function useAdminMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.all }),
  });
}

export const useCreateBusiness = () => useAdminMutation((input: AdminBusinessInput) => data.admin.createBusiness(input));

export const useSetBusinessStatus = () =>
  useAdminMutation(({ businessId, status }: { businessId: string; status: BusinessStatus }) =>
    data.admin.setBusinessStatus(businessId, status),
  );

export const useChangeBusinessPlan = () =>
  useAdminMutation(({ businessId, plan }: { businessId: string; plan: PlanId }) =>
    data.admin.changeBusinessPlan(businessId, plan),
  );

export const useSetUserActive = () =>
  useAdminMutation(({ userId, isActive }: { userId: string; isActive: boolean }) =>
    data.admin.setUserActive(userId, isActive),
  );

export const useApprovePlanRequest = () => useAdminMutation((requestId: string) => data.admin.approvePlanRequest(requestId));

export const useRejectPlanRequest = () =>
  useAdminMutation(({ requestId, reason }: { requestId: string; reason: string }) =>
    data.admin.rejectPlanRequest(requestId, { reason }),
  );

/** El super admin cambia la categoría de un negocio desde su ficha. */
export const useUpdateBusinessCategory = () =>
  useAdminMutation(({ businessId, category }: { businessId: string; category: string }) =>
    data.businesses.update(businessId, { category }),
  );

export const useSetUserPassword = () =>
  useAdminMutation(({ userId, password }: { userId: string; password: string }) =>
    data.admin.setUserPassword(userId, { password }),
  );

export const useAddBusinessMember = () =>
  useAdminMutation(({ businessId, input }: { businessId: string; input: AdminMemberInput }) =>
    data.admin.addBusinessMember(businessId, input),
  );

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlatformSettingsInput) => data.admin.updateSettings(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.platformSettings, settings);
      return queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
