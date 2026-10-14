import { getPlan } from "@/lib/constants/plans";
import { plural, toZonedDate } from "@/lib/format";
import { daysBetween } from "@/lib/time";
import type { AdminBusinessSummary, ISODate } from "@/types";

/** Algo del panel de plataforma que el super admin debería mirar (ver AttentionCard). */
export interface AttentionItem {
  id: string;
  text: string;
  /** A dónde lleva (la ficha del negocio o las solicitudes). */
  href: string;
  tone: "warning" | "info";
}

/** Desde qué parte del cupo del plan se avisa (80 %). */
const NEAR_LIMIT = 0.8;
/** Días sin actividad de un negocio activo para avisar (salvo los recién creados). */
const INACTIVE_DAYS = 14;

/** Días desde una fecha y hora hasta hoy, en la zona del panel (null si no hay fecha). */
export const daysSince = (iso: string | null, today: ISODate) => (iso ? daysBetween(toZonedDate(iso), today) : null);

/**
 * Lo que requiere atención, por orden: solicitudes de cambio de plan, negocios cerca del cupo de su
 * plan (citas del mes o pacientes), negocios activos sin actividad y negocios suspendidos.
 */
export function attentionItems(businesses: AdminBusinessSummary[], pendingRequests: number, today: ISODate): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (pendingRequests > 0) {
    items.push({
      id: "plan-requests",
      text: `${plural(pendingRequests, "solicitud de cambio de plan", "solicitudes de cambio de plan")} por revisar`,
      href: "#solicitudes-de-plan",
      tone: "warning",
    });
  }
  const active = businesses.filter(({ business }) => business.status === "active");
  for (const { business, usage } of active) {
    const planName = getPlan(usage.plan).name;
    const { appointmentsPerMonth, clients } = usage.limits;
    if (appointmentsPerMonth !== null && usage.appointmentsThisMonth >= appointmentsPerMonth * NEAR_LIMIT) {
      items.push({
        id: `${business.id}-appointments`,
        text: `${business.name}: ${usage.appointmentsThisMonth} de ${appointmentsPerMonth} citas del mes (plan ${planName})`,
        href: `/admin/businesses/${business.id}`,
        tone: "warning",
      });
    }
    if (clients !== null && usage.clients >= clients * NEAR_LIMIT) {
      items.push({
        id: `${business.id}-clients`,
        text: `${business.name}: ${usage.clients} de ${clients} pacientes (plan ${planName})`,
        href: `/admin/businesses/${business.id}`,
        tone: "warning",
      });
    }
  }
  for (const { business, lastActivityAt } of active) {
    const created = daysSince(business.createdAt, today) ?? 0;
    const idle = daysSince(lastActivityAt, today);
    if (created < INACTIVE_DAYS || (idle !== null && idle < INACTIVE_DAYS)) continue;
    items.push({
      id: `${business.id}-idle`,
      text: idle === null ? `${business.name}: todavía sin actividad` : `${business.name}: sin actividad hace ${idle} días`,
      href: `/admin/businesses/${business.id}`,
      tone: "info",
    });
  }
  for (const { business } of businesses.filter(({ business }) => business.status === "suspended")) {
    items.push({ id: `${business.id}-suspended`, text: `Negocio suspendido: ${business.name}`, href: `/admin/businesses/${business.id}`, tone: "info" });
  }
  return items;
}
