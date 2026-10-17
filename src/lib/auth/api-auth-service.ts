import { isThemeMode } from "@/features/theme/theme-mode";
import { api } from "@/lib/api/client";
import type { RecoveryCodes, ThemeMode, TwoFactorChallenge, TwoFactorSetup, TwoFactorStatus } from "@/types";
import { isTwoFactorChallenge, type AuthService, type Session } from "./types";

/** Un backend anterior a la spec 019 no manda el modo de pantalla: se toma como «Automático». */
function withThemeMode<T extends Session | TwoFactorChallenge | null>(result: T): T {
  if (!result || isTwoFactorChallenge(result) || isThemeMode(result.themeMode)) return result;
  return { ...result, themeMode: "auto" };
}

/**
 * Autenticación contra agenda-backend. La sesión vive en una cookie httpOnly que el
 * navegador envía sola: el frontend nunca ve ni guarda el token.
 */
export const apiAuthService: AuthService = {
  getSession: () => api.get<Session | null>("/auth/session").then(withThemeMode),
  signIn: (input) => api.post<Session | TwoFactorChallenge>("/auth/login", input).then(withThemeMode),
  verifyTwoFactor: (input) => api.post<Session>("/auth/login/two-factor", input).then(withThemeMode),
  signUp: (input) => api.post<Session>("/auth/register", input).then(withThemeMode),
  signOut: () => api.post<void>("/auth/logout"),
  changePassword: (input) => api.post<void>("/auth/change-password", input),
  setThemeMode: (input) => api.put<{ mode: ThemeMode }>("/auth/theme-mode", input),
  twoFactor: {
    status: () => api.get<TwoFactorStatus>("/auth/two-factor"),
    setup: () => api.post<TwoFactorSetup>("/auth/two-factor/setup"),
    enable: (code) => api.post<RecoveryCodes>("/auth/two-factor/enable", { code }),
    disable: (input) => api.post<void>("/auth/two-factor/disable", input),
    regenerateRecoveryCodes: (code) => api.post<RecoveryCodes>("/auth/two-factor/recovery-codes", { code }),
  },
};
