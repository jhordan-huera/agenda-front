import { REVENUE_STATUSES } from "@/lib/constants/appointment-status";
import { addDaysISO, isPast, startOfWeekISO, type ZonedNow } from "@/lib/time";
import type { Appointment, Client } from "@/types";

export interface DashboardMetrics {
  todayCount: number;
  todayPending: number;
  weekCount: number;
  weekCompleted: number;
  activeClients: number;
  newClientsThisMonth: number;
  monthRevenue: number;
  /** Citas futuras aún sin confirmar. */
  pendingUpcoming: number;
  monthCancellations: number;
}

/** Métricas del panel. Las citas canceladas no cuentan como citas programadas. */
export function getDashboardMetrics(appointments: Appointment[], clients: Client[], now: ZonedNow): DashboardMetrics {
  const weekStart = startOfWeekISO(now.date);
  const weekEnd = addDaysISO(weekStart, 6);
  const month = now.date.slice(0, 7);
  const active = appointments.filter((a) => a.status !== "cancelled");
  const today = active.filter((a) => a.date === now.date);
  const week = active.filter((a) => a.date >= weekStart && a.date <= weekEnd);

  return {
    todayCount: today.length,
    todayPending: today.filter((a) => a.status === "pending").length,
    weekCount: week.length,
    weekCompleted: week.filter((a) => a.status === "completed").length,
    activeClients: clients.filter((c) => c.isActive).length,
    newClientsThisMonth: clients.filter((c) => c.createdAt.startsWith(month)).length,
    monthRevenue: appointments
      .filter((a) => a.date.startsWith(month) && REVENUE_STATUSES.has(a.status))
      .reduce((total, a) => total + a.price, 0),
    pendingUpcoming: appointments.filter((a) => a.status === "pending" && !isPast(a.date, a.startTime, now)).length,
    monthCancellations: appointments.filter((a) => a.status === "cancelled" && a.date.startsWith(month)).length,
  };
}

export function getGreeting(minutes: number): string {
  if (minutes < 12 * 60) return "Buenos días";
  if (minutes < 19 * 60) return "Buenas tardes";
  return "Buenas noches";
}
