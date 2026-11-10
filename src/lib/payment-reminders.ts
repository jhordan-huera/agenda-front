import { paymentRemindersOf } from "@/lib/constants/business";
import { isPast, type ZonedNow } from "@/lib/time";
import type { Appointment, Business, Professional } from "@/types";

/**
 * «Sin comprobante» (spec 039), la misma regla en la agenda, el tablero, la ficha de la cita y la beta: en
 * un negocio con «Pedir el comprobante de pago», una cita Pendiente o Confirmada que aún no empezó, con
 * precio, de una agenda con cuentas para transferir y sin comprobante ni pago. El comprobante se pide sólo
 * antes de la cita: en una que ya empezó, pasó o se completó, no sale nada de la spec 039. `now`: la hora
 * del negocio.
 *
 * El rol Profesional no recibe las cuentas de las otras agendas (spec 009): sólo ve la marca en las suyas.
 */
export function isMissingReceipt(
  appointment: Pick<Appointment, "price" | "status" | "receiptAt" | "paidAt" | "date" | "startTime">,
  business: Pick<Business, "paymentReminders"> | null | undefined,
  professional: Pick<Professional, "bankAccounts"> | null | undefined,
  now: ZonedNow,
): boolean {
  return (
    paymentRemindersOf(business).enabled &&
    (appointment.status === "pending" || appointment.status === "confirmed") &&
    !isPast(appointment.date, appointment.startTime, now) &&
    appointment.price > 0 &&
    !appointment.receiptAt &&
    !appointment.paidAt &&
    (professional?.bankAccounts?.length ?? 0) > 0
  );
}
