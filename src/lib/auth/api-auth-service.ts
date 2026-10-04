import { api } from "@/lib/api/client";
import type { AuthService, Session } from "./types";

/**
 * Autenticación contra agenda-backend. La sesión vive en una cookie httpOnly que el
 * navegador envía sola: el frontend nunca ve ni guarda el token.
 */
export const apiAuthService: AuthService = {
  getSession: () => api.get<Session | null>("/auth/session"),
  signIn: (input) => api.post<Session>("/auth/login", input),
  signUp: (input) => api.post<Session>("/auth/register", input),
  signOut: () => api.post<void>("/auth/logout"),
  changePassword: (input) => api.post<void>("/auth/change-password", input),
};
