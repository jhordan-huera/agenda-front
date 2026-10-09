import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, type AdminAuditFilters } from "@/lib/data";
import type {
  AdminBusinessInput,
  AdminMemberInput,
  BusinessOwnerInput,
  BusinessCategoryInput,
  PlatformAdminInput,
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
    // Sin esperar las recargas: el diálogo se cierra al responder la API.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => data.admin.deleteCategory(categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
}

export const useAdminPlanRequests = () =>
  useQuery({ queryKey: queryKeys.admin.planRequests, queryFn: () => data.admin.listPlanRequests() });

export const useAdminUsers = () => useQuery({ queryKey: queryKeys.admin.users, queryFn: () => data.admin.listUsers() });

export const usePlatformAdmins = () =>
  useQuery({ queryKey: queryKeys.admin.platformAdmins, queryFn: () => data.admin.listPlatformAdmins() });

/** Auditoría de la plataforma con "Cargar más". */
export const useAdminAuditFeed = (filters: Omit<AdminAuditFilters, "cursor">) =>
  useInfiniteQuery({
    queryKey: queryKeys.admin.auditLogs(filters),
    queryFn: ({ pageParam }) => data.admin.listAuditLogs({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

export const useAdminEmails = () => useQuery({ queryKey: queryKeys.admin.emails, queryFn: () => data.admin.listEmails() });

/** Pública: la usan el registro y la pantalla de negocio suspendido. */
export const usePlatformSettings = () =>
  useQuery({ queryKey: queryKeys.platformSettings, queryFn: () => data.platform.getSettings() });

/**
 * Toda mutación de plataforma cambia métricas, listados y auditoría: se invalida el panel entero, sin
 * esperar la recarga (los diálogos se cierran al responder la API).
 */
function useAdminMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
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

export const useSetMaxProfessionals = () =>
  useAdminMutation(({ businessId, maxProfessionals }: { businessId: string; maxProfessionals: number | null }) =>
    data.admin.setMaxProfessionals(businessId, maxProfessionals),
  );

/**
 * Sin esperar a recargar el panel: la ficha del negocio eliminado mostraría "no encontrado"
 * antes de que la página salga de ella.
 */
export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, confirmName }: { businessId: string; confirmName: string }) =>
      data.admin.deleteBusiness(businessId, { confirmName }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

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

export const useAddPlatformAdmin = () => useAdminMutation((input: PlatformAdminInput) => data.admin.addPlatformAdmin(input));

export const useAddBusinessMember = () =>
  useAdminMutation(({ businessId, input }: { businessId: string; input: AdminMemberInput }) =>
    data.admin.addBusinessMember(businessId, input),
  );

export const useAssignBusinessOwner = () =>
  useAdminMutation(({ businessId, input }: { businessId: string; input: BusinessOwnerInput }) =>
    data.admin.assignBusinessOwner(businessId, input),
  );

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlatformSettingsInput) => data.admin.updateSettings(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.platformSettings, settings);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}
