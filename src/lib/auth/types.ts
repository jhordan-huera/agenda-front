import type { ChangePasswordInput, LoginInput, RegisterInput } from "@/lib/validations/auth";
import type { BusinessRole, BusinessStatus, PlatformRole } from "@/types";

export interface Session {
  userId: string;
  /** null mientras el usuario no ha completado el onboarding (y siempre para el super admin). */
  businessId: string | null;
  /** Rol en el negocio (business_users). null sin negocio. */
  role: BusinessRole | null;
  /** Si el negocio está suspendido, el panel muestra un aviso en lugar de los datos. */
  businessStatus: BusinessStatus | null;
  /** "super_admin" para el operador de la plataforma (panel /admin). */
  platformRole: PlatformRole | null;
  /** Puede ver historias clínicas (propietario, miembro autorizado o el super admin en modo soporte). */
  clinicalAccess: boolean;
  /**
   * Sólo en el frontend: el super admin está gestionando un negocio ("Gestionar negocio").
   * Mientras tanto, businessId/role apuntan a ese negocio con permisos de propietario.
   */
  support?: { businessName: string };
}

/**
 * Contrato de autenticación. La implementación (api-auth-service.ts) usa la API de
 * agenda-backend, que guarda la sesión en una cookie httpOnly.
 */
export interface AuthService {
  getSession(): Promise<Session | null>;
  signIn(input: LoginInput): Promise<Session>;
  /** Falla con `forbidden` si el super admin cerró el registro público. */
  signUp(input: RegisterInput): Promise<Session>;
  signOut(): Promise<void>;
  /** Sólo el super admin: las contraseñas de los usuarios las pone él desde el panel /admin. */
  changePassword(input: ChangePasswordInput): Promise<void>;
}
