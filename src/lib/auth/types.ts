import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  TwoFactorDisableInput,
  TwoFactorLoginInput,
} from "@/lib/validations/auth";
import type { BusinessRole, BusinessStatus, PlatformRole, RecoveryCodes, TwoFactorChallenge, TwoFactorSetup, TwoFactorStatus } from "@/types";

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
  /** Super admin principal: gestiona el equipo de super admins (los demás no). */
  platformOwner: boolean;
  /** Puede ver historias clínicas (propietario, miembro autorizado o el super admin en modo soporte). */
  clinicalAccess: boolean;
  /** Su agenda en el negocio, si atiende citas (null: no tiene; también en modo soporte). */
  professionalId: string | null;
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
  /** Con la verificación en dos pasos activada devuelve el paso del código (ver verifyTwoFactor). */
  signIn(input: LoginInput): Promise<Session | TwoFactorChallenge>;
  /** Segundo paso del inicio de sesión: código de la app o de recuperación. */
  verifyTwoFactor(input: TwoFactorLoginInput): Promise<Session>;
  /** Falla con `forbidden` si el super admin cerró el registro público. */
  signUp(input: RegisterInput): Promise<Session>;
  signOut(): Promise<void>;
  /** Sólo el super admin: las contraseñas de los usuarios las pone él desde el panel /admin. */
  changePassword(input: ChangePasswordInput): Promise<void>;
  /** Verificación en dos pasos de la propia cuenta (hoy, sólo el super admin). */
  twoFactor: {
    status(): Promise<TwoFactorStatus>;
    /** Clave nueva para escanear; se activa al confirmar un código con `enable`. */
    setup(): Promise<TwoFactorSetup>;
    enable(code: string): Promise<RecoveryCodes>;
    disable(input: TwoFactorDisableInput): Promise<void>;
    regenerateRecoveryCodes(code: string): Promise<RecoveryCodes>;
  };
}

/** El inicio de sesión pide el código de la verificación en dos pasos. */
export function isTwoFactorChallenge(result: Session | TwoFactorChallenge): result is TwoFactorChallenge {
  return "twoFactorRequired" in result;
}
