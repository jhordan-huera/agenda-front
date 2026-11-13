import type { AdminEmailFilter } from "@/types";

/** Las pestañas de /admin → Actividad (spec 049). */
export type ActivityTab = "actions" | "security" | "emails";

/** Lo que pide la dirección: la pestaña y, en Emails, el filtro (null: lo que haya por defecto). */
export interface ActivityRequest {
  tab: ActivityTab | null;
  emailFilter: AdminEmailFilter | null;
}

const TAB_PARAMS: Record<ActivityTab, string> = { actions: "acciones", security: "seguridad", emails: "emails" };
const EMAIL_PARAMS: Record<AdminEmailFilter, string> = { today: "hoy", failed: "fallidos", all: "todos" };

const tabFromParam = (value: string | null): ActivityTab | null =>
  (Object.keys(TAB_PARAMS) as ActivityTab[]).find((tab) => TAB_PARAMS[tab] === value) ?? null;

const emailFilterFromParam = (value: string | null): AdminEmailFilter | null =>
  (Object.keys(EMAIL_PARAMS) as AdminEmailFilter[]).find((filter) => EMAIL_PARAMS[filter] === value) ?? null;

/**
 * La pestaña y el filtro de emails de la dirección. Siguen valiendo los enlaces de antes de la spec 049:
 * `?ver=seguridad` (los avisos de seguridad) y `?emails=hoy|fallidos|todos` («Ver emails» del Inicio), que
 * abren Emails con ese filtro.
 */
export function readActivityUrl(params: URLSearchParams): ActivityRequest {
  const emailFilter = emailFilterFromParam(params.get("emails"));
  if (emailFilter) return { tab: "emails", emailFilter };
  return { tab: tabFromParam(params.get("ver")), emailFilter: null };
}

/** La dirección de una pestaña: `?ver=seguridad`, o en Emails `?ver=emails&emails=fallidos`. */
export function activitySearch(tab: ActivityTab, emailFilter?: AdminEmailFilter): string {
  const params = new URLSearchParams({ ver: TAB_PARAMS[tab] });
  if (tab === "emails" && emailFilter) params.set("emails", EMAIL_PARAMS[emailFilter]);
  return `?${params}`;
}
