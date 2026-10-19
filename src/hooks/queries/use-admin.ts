import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, DataError, type AdminAuditFilters } from "@/lib/data";
import type {
  AdminBusinessInput,
  AdminMemberInput,
  BusinessOwnerInput,
  BusinessCategoryInput,
  PanelColorsInput,
  PlatformAdminInput,
  PlatformSettingsInput,
} from "@/lib/validations/admin";
import { useSession } from "@/features/auth/use-session";
import type { AdminBusinessDetail, AnalyticsPeriodDays, Business, BusinessStatus, ClientRequiredFields, PlanId } from "@/types";
import { queryKeys } from "./query-keys";

/* Panel del super admin. El backend vuelve a comprobar el rol en cada llamada. */

export const useAdminStats = () => useQuery({ queryKey: queryKeys.admin.stats, queryFn: () => data.admin.getStats() });

/**
 * La analítica (spec 016): la foto que prepara el cron una vez al día. Cambia una vez por mañana, así que
 * no se vuelve a pedir al volver a la pestaña; al cambiar de periodo se ve la anterior mientras llega.
 */
export const useAdminAnalytics = (days: AnalyticsPeriodDays) =>
  useQuery({
    queryKey: queryKeys.admin.analytics(days),
    queryFn: () => data.admin.getAnalytics(days),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

/**
 * La pantalla «Base de datos» (spec 024): se calcula en la API cada vez que se pide (y la ruta tiene un
 * límite de 20 cada 15 minutos), así que sólo se vuelve a pedir con «Actualizar». `enabled`: sólo el super
 * admin principal la pide; con 403 no se reintenta.
 */
export const useAdminDatabase = (enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.admin.database,
    queryFn: () => data.admin.getDatabaseStats(),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (failures, error) => !(error instanceof DataError && ["forbidden", "rate_limited", "two_factor_required"].includes(error.code)) && failures < 1,
  });

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

/** «Descuentos por referidos» del Inicio (spec 023): los ganados y pendientes de aplicar. */
export const useReferralRewards = () =>
  useQuery({ queryKey: queryKeys.admin.referralRewards, queryFn: () => data.admin.listReferralRewards() });

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

/** «Recomendado por» en la ficha (spec 023): recarga el panel (la ficha, la del otro negocio y los descuentos). */
export const useSetReferredBy = () =>
  useAdminMutation(({ businessId, referredBy }: { businessId: string; referredBy: string | null }) =>
    data.admin.setReferredBy(businessId, referredBy),
  );

/** «Marcar como aplicado» un descuento por referido (spec 023). */
export const useApplyReferralReward = () => useAdminMutation((businessId: string) => data.admin.applyReferralReward(businessId));

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
 * Datos obligatorios del paciente de un negocio. También se recarga el negocio en sí: al entrar en él
 * («Gestionar negocio»), el formulario del paciente ya pide los nuevos.
 */
export function useSetClientRequiredFields() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, fields }: { businessId: string; fields: ClientRequiredFields }) =>
      data.admin.setClientRequiredFields(businessId, fields),
    onSuccess: (business) => onBusinessSettingSaved(queryClient, business),
  });
}

/** Citas con varios pacientes en un negocio (como los datos obligatorios: se recarga también el negocio). */
export function useSetMultiClientAppointments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, enabled }: { businessId: string; enabled: boolean }) =>
      data.admin.setMultiClientAppointments(businessId, enabled),
    onSuccess: (business) => onBusinessSettingSaved(queryClient, business),
  });
}

/**
 * Un ajuste del negocio que sólo cambia el super admin: la ficha ya muestra lo guardado (sin «cambios
 * sin guardar» mientras recarga la actividad) y, al entrar en él («Gestionar negocio»), el panel ya lo usa.
 */
function onBusinessSettingSaved(queryClient: ReturnType<typeof useQueryClient>, business: Business) {
  queryClient.setQueryData<AdminBusinessDetail | null>(queryKeys.admin.business(business.id), (current) =>
    current ? { ...current, business } : current,
  );
  queryClient.setQueryData(queryKeys.business(business.id), business);
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
}

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

/** Guarda los colores del panel del super admin y refresca la sesión: el panel cambia al momento (spec 007). */
export function useUpdatePanelColors() {
  const { refresh } = useSession();
  return useMutation({
    mutationFn: (input: PanelColorsInput) => data.admin.updatePanelColors(input),
    onSuccess: () => refresh(),
  });
}

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
