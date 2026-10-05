import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import type { TwoFactorDisableInput } from "@/lib/validations/auth";
import { queryKeys } from "./query-keys";

/** Verificación en dos pasos de la propia cuenta (hoy, sólo el super admin). */
export function useTwoFactorStatus() {
  return useQuery({ queryKey: queryKeys.twoFactor, queryFn: () => authService.twoFactor.status() });
}

export function useTwoFactorSetup() {
  return useMutation({ mutationFn: () => authService.twoFactor.setup() });
}

export function useEnableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => authService.twoFactor.enable(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor }),
  });
}

export function useDisableTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TwoFactorDisableInput) => authService.twoFactor.disable(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor }),
  });
}

export function useRegenerateRecoveryCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => authService.twoFactor.regenerateRecoveryCodes(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.twoFactor }),
  });
}
