import type { AuditLogFilters } from "@/lib/data";
import type { AuditChange, AuditEntityType } from "@/types";

/** Lo que el usuario elige en la barra de filtros (fechas "YYYY-MM-DD" del calendario). */
export interface AuditFilterState {
  type: AuditEntityType | "all";
  actor: string;
  from: string;
  to: string;
  q: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilterState = { type: "all", actor: "all", from: "", to: "", q: "" };

export const AUDIT_TYPE_LABELS: Record<AuditEntityType, string> = {
  appointment: "Citas",
  client: "Clientes",
  service: "Servicios",
  schedule: "Horarios",
  blocked_time: "Bloqueos",
  professional: "Profesionales",
  business: "Negocio",
  team: "Equipo",
  subscription: "Suscripción",
  clinical_record: "Historias clínicas",
  user: "Usuarios",
  platform: "Plataforma",
  session: "Sesiones",
};

/** Filtros para la API: las fechas del calendario, en la hora local del navegador (hasta: día incluido). */
export function toAuditQuery(state: AuditFilterState): Omit<AuditLogFilters, "cursor"> {
  const startOf = (day: string) => new Date(`${day}T00:00:00`);
  const nextDay = (day: string) => {
    const date = startOf(day);
    date.setDate(date.getDate() + 1);
    return date;
  };
  return {
    entityType: state.type === "all" ? undefined : state.type,
    actorId: state.actor === "all" ? undefined : state.actor,
    from: state.from ? startOf(state.from).toISOString() : undefined,
    to: state.to ? nextDay(state.to).toISOString() : undefined,
    q: state.q.trim() || undefined,
  };
}

/** "Precio: $20 → $25" · "Notas: modificado" */
export function describeChange(change: AuditChange): string {
  return change.before === null ? `${change.label}: modificado` : `${change.label}: ${change.before} → ${change.after}`;
}
