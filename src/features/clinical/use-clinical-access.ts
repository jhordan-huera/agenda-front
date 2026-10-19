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

/**
 * ¿Es el modo soporte en un negocio con la historia clínica activada? Ahí, en lugar de la historia,
 * se muestra el aviso de privacidad (spec 025): el soporte no la ve.
 */
export function useClinicalSupportBlocked(): boolean {
  const { session } = useSession();
  const { data: business } = useCurrentBusiness();
  return Boolean(business?.clinicalRecordsEnabled && session?.support);
}

/**
 * ¿Puede gestionar los formatos de historia clínica? Como `useClinicalAccess`, y además el soporte:
 * son plantillas, no datos de pacientes (spec 025).
 */
export function useClinicalTemplatesAccess(): boolean {
  const { session } = useSession();
  const { data: business } = useCurrentBusiness();
  return Boolean(business?.clinicalRecordsEnabled && (session?.clinicalAccess || session?.support));
}
