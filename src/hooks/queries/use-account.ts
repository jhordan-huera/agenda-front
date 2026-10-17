import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { useBusinessId, useSession } from "@/features/auth/use-session";
import { authService } from "@/lib/auth";
import { data, getErrorMessage, type UpdateBusinessInput } from "@/lib/data";
import type { ProfileInput } from "@/lib/validations/business";
import type { ThemeMode } from "@/types";
import { queryKeys } from "./query-keys";

export function useCurrentUser() {
  const { session } = useSession();
  const userId = session?.userId ?? "";
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => data.users.getById(userId),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    /** `currentPassword`: obligatoria si cambia el email (con el que se inicia sesión). */
    mutationFn: (input: ProfileInput & { currentPassword?: string }) => data.users.update(session!.userId, input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.user(user.id), user);
      // Su nombre y su foto son los de su agenda: también cambian en la lista de profesionales y en la página pública.
      queryClient.invalidateQueries({ queryKey: ["professionals"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
    },
  });
}

/**
 * Modo de pantalla de la propia cuenta (spec 019). Optimista: la sesión cambia al momento (y con ella
 * la pantalla) y, si no se guarda, vuelve al modo de antes con un aviso. Lo usa ThemeModeProvider
 * (useThemeMode().setMode), que vive fuera del router.
 */
export function useSetThemeMode() {
  const { session, updateSession } = useSession();
  const queryClient = useQueryClient();
  // El último modo pedido: si se eligen dos seguidos y falla el primero, no pisa al segundo.
  const latest = useRef<ThemeMode | null>(null);
  return useMutation({
    mutationFn: (mode: ThemeMode) => authService.setThemeMode({ mode }),
    onMutate: (mode) => {
      latest.current = mode;
      const previous = session?.themeMode ?? "auto";
      updateSession({ themeMode: mode });
      return { previous };
    },
    onError: (error, mode, context) => {
      if (context && latest.current === mode) updateSession({ themeMode: context.previous });
      toast.error("No se pudo cambiar el modo de pantalla", { description: getErrorMessage(error) });
    },
    onSuccess: () => {
      // El cambio queda en la actividad: la del negocio o, para el super admin, la de la plataforma.
      void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useCurrentBusiness() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.business(businessId),
    queryFn: () => data.businesses.getById(businessId),
  });
}

export function useUpdateBusiness() {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessInput) => data.businesses.update(businessId, input),
    onSuccess: (business) => {
      queryClient.setQueryData(queryKeys.business(businessId), business);
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(businessId) });
    },
  });
}

export function useSubscription() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.subscription(businessId),
    queryFn: () => data.subscriptions.get(businessId),
  });
}

/** Uso actual frente a los límites del plan (citas del mes, clientes, usuarios). */
export function usePlanUsage() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.usage(businessId),
    queryFn: () => data.subscriptions.getUsage(businessId),
  });
}


