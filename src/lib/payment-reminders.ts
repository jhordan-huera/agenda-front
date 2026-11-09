import { paymentRemindersOf } from "@/lib/constants/business";
import type { Appointment, Business, Professional } from "@/types";

/**
 * «Sin comprobante» (spec 039), la misma regla en la agenda, el tablero, la ficha de la cita y la beta: en
 * un negocio con «Pedir el comprobante de pago», una cita con precio, de una agenda con cuentas para
 * transferir, que no está cancelada ni en «No asistió» y no tiene comprobante ni está marcada como pagada.
 * No depende del modo de la agenda: es lo que le falta a la cita, no el día de su recordatorio.
 *
 * El rol Profesional no recibe las cuentas de las otras agendas (spec 009): sólo ve la marca en las suyas.
 */
export function isMissingReceipt(
  appointment: Pick<Appointment, "price" | "status" | "receiptAt" | "paidAt">,
  business: Pick<Business, "paymentReminders"> | null | undefined,
  professional: Pick<Professional, "bankAccounts"> | null | undefined,
): boolean {
  return (
    paymentRemindersOf(business).enabled &&
    appointment.price > 0 &&
    !appointment.receiptAt &&
    !appointment.paidAt &&
    appointment.status !== "cancelled" &&
    appointment.status !== "no_show" &&
    (professional?.bankAccounts?.length ?? 0) > 0
  );
}
