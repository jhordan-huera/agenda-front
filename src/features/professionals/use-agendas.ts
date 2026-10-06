import { useSession } from "@/features/auth/use-session";
import { useProfessionals } from "@/hooks/queries/use-professionals";
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

/** La agenda con la que empieza un formulario o un filtro: la propia o la primera. */
export function defaultAgendaId(agendas: ReturnType<typeof useAgendas>): string {
  return (
    agendas.selectable.find((professional) => professional.id === agendas.ownProfessionalId)?.id ??
    agendas.selectable[0]?.id ??
    ""
  );
}
