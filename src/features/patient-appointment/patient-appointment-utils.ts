import { formatDate } from "@/lib/format";
import type { PublicAppointment } from "@/types";

/** "martes 20 de octubre a las 10:00": la cita en los mensajes de «Tu cita» (spec 010). */
export const dayAndTimeOf = (appointment: Pick<PublicAppointment, "date" | "startTime">) =>
  `${formatDate(appointment.date, "EEEE d 'de' MMMM")} a las ${appointment.startTime}`;

/**
 * Cómo avisar al negocio: «escríbele a Centro Profesional» si tiene teléfono (WhatsApp y llamar) y
 * «comunícate con Centro Profesional» si no (la página no tiene botones que ofrecer).
 */
export const reachOf = (business: Pick<PublicAppointment["business"], "name" | "phone">) =>
  business.phone ? `escríbele a ${business.name}` : `comunícate con ${business.name}`;

/** Lo que acaba de pasar en la página: se anuncia arriba, con el foco. */
export type AppointmentOutcome = "confirmed" | "already_confirmed" | "cancelled";
