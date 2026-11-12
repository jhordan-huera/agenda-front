import { PENDING_PAYMENTS_SINCE } from "@/lib/constants/business";
import type { Appointment } from "@/types";

type PendingCandidate = Pick<Appointment, "status" | "price" | "paidAt" | "date">;

/**
 * «Por cobrar» (spec 046): una sesión Completada, con precio, sin la marca de pagada y atendida desde
 * PENDING_PAYMENTS_SINCE. La misma regla que la API (`payment-service.ts` y el resumen por paciente), que la
 * cuenta para el paciente principal, el que paga. Las canceladas, «No asistió», las pendientes o confirmadas y
 * las gratis no cuentan.
 */
export function isPendingPayment(appointment: PendingCandidate): boolean {
  return (
    appointment.status === "completed" &&
    appointment.price > 0 &&
    !appointment.paidAt &&
    appointment.date >= PENDING_PAYMENTS_SINCE
  );
}

/** Las sesiones por cobrar de un paciente (sólo las suyas como principal), de la más antigua a la más reciente. */
export function pendingPaymentsOf<T extends PendingCandidate & Pick<Appointment, "clientId" | "startTime">>(
  appointments: T[],
  clientId: string,
): T[] {
  return appointments
    .filter((appointment) => appointment.clientId === clientId && isPendingPayment(appointment))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

/** El total de unas sesiones por cobrar. */
export const pendingTotal = (appointments: Pick<Appointment, "price">[]): number =>
  appointments.reduce((sum, appointment) => sum + appointment.price, 0);
