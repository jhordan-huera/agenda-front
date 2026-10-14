import { getPlan, PLANS } from "@/lib/constants/plans";
import { toZonedDate } from "@/lib/format";
import { daysBetween } from "@/lib/time";
import type { AdminBusinessSummary, GrowthPair, ISODate, PlanId } from "@/types";

/**
 * «Negocios para vender» del inicio del super admin (spec 006): a quién ofrecerle un plan mejor,
 * quién crece y quién dejó de usar el sistema. Sólo negocios activos.
 */

/** Desde qué parte del cupo del plan se avisa (80 %). */
export const NEAR_LIMIT = 0.8;
/** Días sin actividad para «Dejaron de usarlo» (salvo los creados en esos días). */
export const INACTIVE_DAYS = 14;
/** Citas este mes que necesita un negocio para estar entre «Los que más crecen», y cuántos se muestran. */
const MIN_GROWTH_APPOINTMENTS = 5;
const TOP_GROWING = 5;

/** Días desde una fecha y hora hasta hoy, en la zona del panel (null si no hay fecha). */
export const daysSince = (iso: string | null, today: ISODate) => (iso ? daysBetween(toZonedDate(iso), today) : null);

/** El plan siguiente, para ofrecerlo (Free → Pro, Pro → Business; null en el último). */
export function nextPlan(plan: PlanId) {
  const index = PLANS.findIndex((candidate) => candidate.id === plan);
  return PLANS[index + 1] ?? null;
}

/** Cómo cambió una cifra frente al periodo anterior: sube, baja, igual o nueva (antes en 0). */
export function growthChange({ current, previous }: GrowthPair): { kind: "up" | "down" | "same" | "new"; percent: number } {
  if (previous === 0) return { kind: current > 0 ? "new" : "same", percent: 0 };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { kind: percent > 0 ? "up" : percent < 0 ? "down" : "same", percent };
}

const active = (businesses: AdminBusinessSummary[]) => businesses.filter(({ business }) => business.status === "active");

/** Los que usan el 80 % o más de las citas del mes o de los pacientes de su plan, los más llenos primero. */
export function nearLimit(businesses: AdminBusinessSummary[]) {
  return active(businesses)
    .flatMap((summary) => {
      const { usage } = summary;
      const uses = [
        { used: usage.appointmentsThisMonth, limit: usage.limits.appointmentsPerMonth, what: "citas del mes" },
        { used: usage.clients, limit: usage.limits.clients, what: "pacientes" },
      ].filter((use): use is { used: number; limit: number; what: string } => use.limit !== null && use.used >= use.limit * NEAR_LIMIT);
      if (uses.length === 0) return [];
      const fullest = uses.reduce((a, b) => (a.used / a.limit >= b.used / b.limit ? a : b));
      return [{ summary, share: fullest.used / fullest.limit, text: uses.map((use) => `${use.used} de ${use.limit} ${use.what}`).join(" · "), plan: getPlan(usage.plan), offer: nextPlan(usage.plan) }];
    })
    .sort((a, b) => b.share - a.share);
}

/** Los que más crecen en citas agendadas frente a los mismos días del mes pasado (hasta 5). */
export function topGrowing(businesses: AdminBusinessSummary[]) {
  return active(businesses)
    .filter(({ growth }) => growth && growth.current >= MIN_GROWTH_APPOINTMENTS && growth.current > growth.previous)
    .map((summary) => ({ summary, change: growthChange(summary.growth) }))
    .sort((a, b) =>
      // Primero los que antes no tenían citas (crecen desde cero), después por porcentaje.
      a.change.kind === "new" || b.change.kind === "new"
        ? Number(b.change.kind === "new") - Number(a.change.kind === "new") || b.summary.growth.current - a.summary.growth.current
        : b.change.percent - a.change.percent,
    )
    .slice(0, TOP_GROWING);
}

/** Los activos sin actividad hace 14 días o más (los recién creados, no), los más quietos primero. */
export function idle(businesses: AdminBusinessSummary[], today: ISODate) {
  return active(businesses)
    .map((summary) => ({ summary, days: daysSince(summary.lastActivityAt, today), age: daysSince(summary.business.createdAt, today) ?? 0 }))
    .filter(({ days, age }) => age >= INACTIVE_DAYS && (days === null || days >= INACTIVE_DAYS))
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
}
