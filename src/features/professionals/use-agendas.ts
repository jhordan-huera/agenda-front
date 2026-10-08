import { useSession } from "@/features/auth/use-session";
import { useSubscription } from "@/hooks/queries/use-account";
import { useProfessionals } from "@/hooks/queries/use-professionals";
import { getPlan } from "@/lib/constants/plans";
import { isAgendaScoped } from "@/lib/permissions";
import type { Professional } from "@/types";

/**
 * Las agendas del negocio vistas por el usuario: todas (también las inactivas, para nombrar citas
 * antiguas), las que puede elegir y si hay varias. El rol Profesional sólo trabaja sobre la suya
 * (la API ya le filtra el resto).
 */
export function useAgendas() {
  const { session } = useSession();
  const query = useProfessionals();
  const all = query.data ?? [];
  const scoped = isAgendaScoped(session?.role);
  const ownProfessionalId = session?.professionalId ?? null;
  const active = all.filter((professional) => professional.isActive);
  const selectable = scoped ? active.filter((professional) => professional.id === ownProfessionalId) : active;
  return {
    isPending: query.isPending,
    all,
    /** Las que el usuario puede elegir al agendar, filtrar o editar horarios. */
    selectable,
    /** Hay más de una agenda que elegir: se muestran los selectores y los nombres de los profesionales. */
    multiple: selectable.length > 1,
    scoped,
    ownProfessionalId,
    byId: (id: string | null | undefined): Professional | undefined => all.find((professional) => professional.id === id),
  };
}

/**
 * ¿Trabaja el negocio con varias agendas (sección Profesionales, rol Profesional)? Sólo el plan
 * Business; Free y Pro son cuentas individuales. También un negocio que ya tiene varias (p. ej. tras
 * bajar de plan), para que pueda ordenarlas. undefined mientras carga.
 */
export function useMultiAgendaAccess(): boolean | undefined {
  const subscription = useSubscription();
  const professionals = useProfessionals();
  if (!subscription.data || !professionals.data) return undefined;
  return getPlan(subscription.data.plan).multipleAgendas || professionals.data.length > 1;
}

/**
 * Dónde se ponen el enlace de videollamada y los datos bancarios: en cada profesional o, en una
 * cuenta individual, en el perfil.
 */
export const meetingUrlPlace = (multiAgenda: boolean | undefined) =>
  multiAgenda ? "Profesionales → Editar" : "Configuración → Perfil";

/** La agenda con la que empieza un formulario o un filtro: la propia o la primera. */
export function defaultAgendaId(agendas: ReturnType<typeof useAgendas>): string {
  return (
    agendas.selectable.find((professional) => professional.id === agendas.ownProfessionalId)?.id ??
    agendas.selectable[0]?.id ??
    ""
  );
}
