import { BLOCKING_STATUSES } from "@/lib/constants/appointment-status";
import { joinNames } from "@/lib/format";
import { durationInMinutes, isPast, minutesToTime, type ZonedNow } from "@/lib/time";
import type { AppointmentInput } from "@/lib/validations/appointment";
import type { Appointment, Client, HomeVisitAddress, Service, ServiceMode } from "@/types";

export function getClientName(clientsById: Map<string, Client>, clientId: string): string {
  return clientsById.get(clientId)?.name ?? "Cliente eliminado";
}

/**
 * Todos los pacientes de la cita: el principal primero y luego los demás (citas con varios pacientes,
 * Business.multiClientAppointments). `extraClientIds` puede faltar si la API es anterior.
 */
export function appointmentClientIds(appointment: Pick<Appointment, "clientId"> & { extraClientIds?: string[] }): string[] {
  return [appointment.clientId, ...(appointment.extraClientIds ?? [])];
}

/**
 * Los nombres de los pacientes de la cita: "Ana Torres" o "Ana Torres y Carlos Pérez". Con `max`, si
 * hay más se resume: "Ana Torres y 2 más" (bloques pequeños de la agenda).
 */
export function getAppointmentClientNames(
  clientsById: Map<string, Client>,
  appointment: Pick<Appointment, "clientId"> & { extraClientIds?: string[] },
  options: { max?: number; fallback?: string } = {},
): string {
  const names = appointmentClientIds(appointment).map((id) => clientsById.get(id)?.name ?? options.fallback ?? "Cliente eliminado");
  const max = options.max ?? names.length;
  if (names.length > max) return `${names[0]} y ${names.length - 1} más`;
  return joinNames(names);
}

/**
 * Los pacientes «Por verificar» de la cita (spec 009): escribieron la cédula de otra ficha con otro
 * email y otro teléfono. Vacío: la cita no tiene nada que revisar.
 */
export function clientsToVerify(
  clientsById: Map<string, Client>,
  appointment: Pick<Appointment, "clientId"> & { extraClientIds?: string[] },
): Client[] {
  return appointmentClientIds(appointment).flatMap((id) => {
    const client = clientsById.get(id);
    return client?.claimedClientId ? [client] : [];
  });
}

export function getServiceName(servicesById: Map<string, Service>, serviceId: string): string {
  return servicesById.get(serviceId)?.name ?? "Servicio eliminado";
}

/** Citas activas que aún no han empezado, en orden cronológico. */
export function getUpcomingAppointments(appointments: Appointment[], now: ZonedNow): Appointment[] {
  return appointments
    .filter((a) => BLOCKING_STATUSES.has(a.status) && a.status !== "completed" && !isPast(a.date, a.startTime, now))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

/** Próxima media hora (para proponer la hora de una cita nueva hoy). */
export function suggestStartTime(now: ZonedNow): string {
  const next = Math.ceil((now.minutes + 1) / 30) * 30;
  return next >= 7 * 60 && next <= 21 * 60 ? minutesToTime(next) : "09:00";
}

/** Dirección vacía para empezar una cita a domicilio. */
export const EMPTY_HOME_VISIT: HomeVisitAddress = { address: "", reference: "", lat: null, lng: null };

/** Quita los errores de los campos de domicilio que se acaban de editar (el mapa resuelve "homeVisit.lat"). */
export function clearHomeVisitErrors(errors: Record<string, string>, patch: Partial<HomeVisitAddress>) {
  const next = { ...errors };
  for (const key of Object.keys(patch)) delete next[`homeVisit.${key === "lng" ? "lat" : key}`];
  return next;
}

/** Dónde es una cita: en el local, a domicilio o por videollamada. */
export function getPlace(appointment: { homeVisit: HomeVisitAddress | null; isVirtual: boolean }): ServiceMode {
  return appointment.isVirtual ? "virtual" : appointment.homeVisit ? "home" : "business";
}

/** Precio de lista de un servicio según el lugar: a domicilio se suma el recargo. */
export function getListPrice(service: Pick<Service, "price" | "homeVisitFee">, atHome: boolean): number {
  return service.price + (atHome ? service.homeVisitFee : 0);
}

/** Enlace privado de pago de la cita (datos para transferir y subida del comprobante). */
export const paymentLinkOf = (appointment: Pick<Appointment, "paymentToken">) =>
  `${window.location.origin}/pago/${appointment.paymentToken}`;

/** Los datos de una cita tal como los pide la API al guardarla (p. ej. al moverla en la agenda). */
export function appointmentToInput(appointment: Appointment): AppointmentInput {
  return {
    clientId: appointment.clientId,
    // Siempre: al mover la cita en la agenda se reenvía todo y, sin la lista, la API conserva la que tenía.
    extraClientIds: appointment.extraClientIds ?? [],
    serviceId: appointment.serviceId,
    date: appointment.date,
    startTime: appointment.startTime,
    durationMinutes: durationInMinutes(appointment.startTime, appointment.endTime),
    price: appointment.price,
    status: appointment.status,
    notes: appointment.notes,
    homeVisit: appointment.homeVisit,
    isVirtual: appointment.isVirtual,
    professionalId: appointment.professionalId,
  };
}
