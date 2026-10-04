import type { Session } from "./types";

/** Pantalla de inicio según el tipo de cuenta: plataforma, panel del negocio u onboarding. */
export function getHomePath(session: Session): string {
  if (session.platformRole === "super_admin") return "/admin";
  return session.businessId ? "/dashboard" : "/onboarding";
}
