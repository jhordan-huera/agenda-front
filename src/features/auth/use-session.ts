import { createContext, useContext } from "react";
import type { Session } from "@/lib/auth";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionContextValue {
  status: SessionStatus;
  session: Session | null;
  signIn: (input: LoginInput) => Promise<Session>;
  signUp: (input: RegisterInput) => Promise<Session>;
  signOut: () => Promise<void>;
  /** Vuelve a leer la sesión (p. ej. tras crear el negocio en el onboarding). */
  refresh: () => Promise<Session | null>;
  /** Super admin: empieza a gestionar un negocio como si fuera su propietario. */
  enterSupport: (business: { id: string; name: string }) => void;
  exitSupport: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return context;
}

/** Negocio activo (tenant). Sólo para componentes dentro del panel, que exige negocio configurado. */
export function useBusinessId(): string {
  const { session } = useSession();
  if (!session?.businessId) throw new Error("No hay un negocio activo en la sesión");
  return session.businessId;
}
