import { useSession } from "@/features/auth/use-session";
import { useCurrentBusiness } from "@/hooks/queries/use-account";

/**
 * ¿Puede el usuario ver historias clínicas? El negocio debe tenerla activada y el usuario
 * ser el propietario o un miembro autorizado. El backend lo vuelve a comprobar siempre.
 */
export function useClinicalAccess(): boolean {
  const { session } = useSession();
  const { data: business } = useCurrentBusiness();
  return Boolean(business?.clinicalRecordsEnabled && session?.clinicalAccess);
}
