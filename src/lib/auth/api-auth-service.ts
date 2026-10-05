import { api } from "@/lib/api/client";
import type { RecoveryCodes, TwoFactorChallenge, TwoFactorSetup, TwoFactorStatus } from "@/types";
import type { AuthService, Session } from "./types";

/**
 * Autenticación contra agenda-backend. La sesión vive en una cookie httpOnly que el
 * navegador envía sola: el frontend nunca ve ni guarda el token.
 */
export const apiAuthService: AuthService = {
  getSession: () => api.get<Session | null>("/auth/session"),
  signIn: (input) => api.post<Session | TwoFactorChallenge>("/auth/login", input),
  verifyTwoFactor: (input) => api.post<Session>("/auth/login/two-factor", input),
  signUp: (input) => api.post<Session>("/auth/register", input),
  signOut: () => api.post<void>("/auth/logout"),
  changePassword: (input) => api.post<void>("/auth/change-password", input),
  twoFactor: {
    status: () => api.get<TwoFactorStatus>("/auth/two-factor"),
    setup: () => api.post<TwoFactorSetup>("/auth/two-factor/setup"),
    enable: (code) => api.post<RecoveryCodes>("/auth/two-factor/enable", { code }),
    disable: (input) => api.post<void>("/auth/two-factor/disable", input),
    regenerateRecoveryCodes: (code) => api.post<RecoveryCodes>("/auth/two-factor/recovery-codes", { code }),
  },
};
