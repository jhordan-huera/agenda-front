import { BLOCKING_STATUSES } from "@/lib/constants/appointment-status";
import { isPast, type ZonedNow } from "@/lib/time";
import type { Appointment } from "@/types";

export interface ClientSummary {
  lastAppointment?: Appointment;
  nextAppointment?: Appointment;
  /** Citas no canceladas. */
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  /** Suma de citas completadas. */
  totalSpent: number;
}

const EMPTY_SUMMARY: ClientSummary = { totalAppointments: 0, completed: 0, cancelled: 0, noShow: 0, totalSpent: 0 };

/** Resumen por cliente a partir de las citas del negocio (una sola pasada). */
export function summarizeByClient(appointments: Appointment[], now: ZonedNow): Map<string, ClientSummary> {
  const summaries = new Map<string, ClientSummary>();
  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  for (const appointment of sorted) {
    const summary = summaries.get(appointment.clientId) ?? { ...EMPTY_SUMMARY };
    if (appointment.status !== "cancelled") summary.totalAppointments += 1;
    if (appointment.status === "completed") {
      summary.completed += 1;
      summary.totalSpent += appointment.price;
    }
    if (appointment.status === "cancelled") summary.cancelled += 1;
    if (appointment.status === "no_show") summary.noShow += 1;

    if (isPast(appointment.date, appointment.startTime, now)) {
      if (appointment.status !== "cancelled") summary.lastAppointment = appointment;
    } else if (!summary.nextAppointment && BLOCKING_STATUSES.has(appointment.status)) {
      summary.nextAppointment = appointment;
    }
    summaries.set(appointment.clientId, summary);
  }
  return summaries;
}

export function getClientSummary(summaries: Map<string, ClientSummary>, clientId: string): ClientSummary {
  return summaries.get(clientId) ?? EMPTY_SUMMARY;
}
