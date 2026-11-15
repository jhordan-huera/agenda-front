import { formatDate } from "@/lib/format";
import { daysBetween } from "@/lib/time";
import type { ISODate } from "@/types";

/**
 * Los textos del recordatorio de control (spec 051), sin React: los comprueba `npm run check:control-reminders`.
 */

/** «5 días», «2 semanas», «3 meses» o «más de un año». */
function span(days: number): string {
  if (days < 14) return days === 1 ? "1 día" : `${days} días`;
  if (days < 60) return `${Math.round(days / 7)} semanas`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 mes" : `${months} meses`;
  }
  return "más de un año";
}

/**
 * Cuándo le toca, contado desde `today` (la fecha del negocio): «Venció hace 2 semanas», «Vence hoy», «Vence mañana» o
 * «Vence en 5 días». `overdue`: ya pasó la fecha.
 */
export function describeControlDue(dueOn: ISODate, today: ISODate): { overdue: boolean; label: string } {
  const days = daysBetween(today, dueOn);
  if (days === 0) return { overdue: false, label: "Vence hoy" };
  if (days === 1) return { overdue: false, label: "Vence mañana" };
  if (days === -1) return { overdue: true, label: "Venció ayer" };
  if (days < 0) return { overdue: true, label: `Venció hace ${span(-days)}` };
  return { overdue: false, label: `Vence en ${span(days)}` };
}

/** La página de reservas con el servicio y el profesional ya elegidos, como el botón del email. */
export function controlBookingUrl(origin: string, slug: string, control: { serviceId: string; professionalId: string }): string {
  return `${origin}/book/${encodeURIComponent(slug)}?${new URLSearchParams({ servicio: control.serviceId, profesional: control.professionalId }).toString()}`;
}

/** La línea de la ficha del paciente: «Próximo control: Limpieza dental, 12 de mayo» o «Control vencido hace 2 semanas: Limpieza dental». */
export function describeClientControl(control: { serviceName: string; dueOn: ISODate }, today: ISODate): string {
  const due = describeControlDue(control.dueOn, today);
  if (!due.overdue) return `Próximo control: ${control.serviceName}, ${formatDate(control.dueOn, "d 'de' MMMM")}`;
  return `Control vencido ${due.label.replace(/^Venció /, "")}: ${control.serviceName}`;
}
