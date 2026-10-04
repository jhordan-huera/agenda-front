import { APPOINTMENT_STATUSES, REVENUE_STATUSES } from "@/lib/constants/appointment-status";
import { formatDate } from "@/lib/format";
import { addDaysISO, eachDayISO, startOfWeekISO } from "@/lib/time";
import type { Appointment, AppointmentStatus, ISODate, Service } from "@/types";

/**
 * Cálculos de reportes: funciones puras sobre la lista de citas.
 * Con PostgreSQL podrían sustituirse por vistas o consultas agregadas.
 */

export const REPORT_PERIODS = [7, 30, 90] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/** Últimos `days` días, incluido hoy. */
export function getPeriodRange(today: ISODate, days: ReportPeriod): DateRange {
  return { from: addDaysISO(today, -(days - 1)), to: today };
}

export function filterByRange(appointments: Appointment[], { from, to }: DateRange): Appointment[] {
  return appointments.filter((a) => a.date >= from && a.date <= to);
}

type StatusCounts = Record<AppointmentStatus, number>;

const emptyCounts = (): StatusCounts => ({ pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 });

function countByStatus(appointments: Appointment[]): StatusCounts {
  const counts = emptyCounts();
  for (const appointment of appointments) counts[appointment.status] += 1;
  return counts;
}

export interface ReportSummary {
  total: number;
  byStatus: StatusCounts;
  /** Suma de citas pendientes, confirmadas y completadas. */
  estimatedRevenue: number;
  /** Suma de citas completadas. */
  completedRevenue: number;
  /** Completadas / (completadas + no asistió); null si no hay datos. */
  attendanceRate: number | null;
}

export function summarize(appointments: Appointment[]): ReportSummary {
  const byStatus = countByStatus(appointments);
  const attended = byStatus.completed + byStatus.no_show;
  return {
    total: appointments.length,
    byStatus,
    estimatedRevenue: appointments.filter((a) => REVENUE_STATUSES.has(a.status)).reduce((sum, a) => sum + a.price, 0),
    completedRevenue: appointments.filter((a) => a.status === "completed").reduce((sum, a) => sum + a.price, 0),
    attendanceRate: attended > 0 ? byStatus.completed / attended : null,
  };
}

export function share(part: number, total: number): number {
  return total > 0 ? part / total : 0;
}

export interface VolumePoint {
  key: ISODate;
  /** Etiqueta corta para el eje. */
  label: string;
  /** Etiqueta completa para tooltip y tabla. */
  fullLabel: string;
  total: number;
  byStatus: StatusCounts;
}

/** Citas por día; en periodos largos se agrupan por semana para que el gráfico sea legible. */
export function getVolumeSeries(appointments: Appointment[], range: DateRange, groupByWeek: boolean): VolumePoint[] {
  const bucketOf = (date: ISODate) => (groupByWeek ? startOfWeekISO(date) : date);
  const buckets = new Map<ISODate, VolumePoint>();

  for (const day of eachDayISO(range.from, range.to)) {
    const key = bucketOf(day);
    if (buckets.has(key)) continue;
    buckets.set(key, {
      key,
      label: groupByWeek ? formatDate(key, "d MMM") : formatDate(key, "d"),
      fullLabel: groupByWeek ? `Semana del ${formatDate(key, "d 'de' MMMM")}` : formatDate(key, "EEEE d 'de' MMMM"),
      total: 0,
      byStatus: emptyCounts(),
    });
  }
  for (const appointment of appointments) {
    const point = buckets.get(bucketOf(appointment.date));
    if (!point) continue;
    point.total += 1;
    point.byStatus[appointment.status] += 1;
  }
  return [...buckets.values()];
}

export interface StatusShare {
  status: AppointmentStatus;
  count: number;
  share: number;
}

export function getStatusBreakdown(summary: ReportSummary): StatusShare[] {
  return APPOINTMENT_STATUSES.map((status) => ({
    status,
    count: summary.byStatus[status],
    share: share(summary.byStatus[status], summary.total),
  }));
}

export interface ServiceRanking {
  serviceId: string;
  name: string;
  count: number;
  revenue: number;
}

/** Servicios ordenados por número de citas (sin contar canceladas). */
export function getTopServices(
  appointments: Appointment[],
  servicesById: Map<string, Service>,
  limit = 5,
): ServiceRanking[] {
  const ranking = new Map<string, ServiceRanking>();
  for (const appointment of appointments) {
    if (appointment.status === "cancelled") continue;
    const entry = ranking.get(appointment.serviceId) ?? {
      serviceId: appointment.serviceId,
      name: servicesById.get(appointment.serviceId)?.name ?? "Servicio eliminado",
      count: 0,
      revenue: 0,
    };
    entry.count += 1;
    if (REVENUE_STATUSES.has(appointment.status)) entry.revenue += appointment.price;
    ranking.set(appointment.serviceId, entry);
  }
  return [...ranking.values()].sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, limit);
}

export interface RevenueSnapshot {
  day: number;
  week: number;
  month: number;
}

/** Ingresos estimados de hoy, esta semana (lunes–domingo) y este mes. */
export function getRevenueSnapshot(appointments: Appointment[], today: ISODate): RevenueSnapshot {
  const weekStart = startOfWeekISO(today);
  const weekEnd = addDaysISO(weekStart, 6);
  const month = today.slice(0, 7);
  const sum = (predicate: (a: Appointment) => boolean) =>
    appointments.filter((a) => REVENUE_STATUSES.has(a.status) && predicate(a)).reduce((total, a) => total + a.price, 0);
  return {
    day: sum((a) => a.date === today),
    week: sum((a) => a.date >= weekStart && a.date <= weekEnd),
    month: sum((a) => a.date.startsWith(month)),
  };
}

export interface ClientRetention {
  /** Su primera cita (no cancelada) cae dentro del periodo. */
  newClients: number;
  /** Ya tenían citas antes del periodo. */
  returningClients: number;
}

export function getClientRetention(allAppointments: Appointment[], range: DateRange): ClientRetention {
  const firstVisit = new Map<string, ISODate>();
  const activeInRange = new Set<string>();
  for (const appointment of allAppointments) {
    if (appointment.status === "cancelled") continue;
    const first = firstVisit.get(appointment.clientId);
    if (!first || appointment.date < first) firstVisit.set(appointment.clientId, appointment.date);
    if (appointment.date >= range.from && appointment.date <= range.to) activeInRange.add(appointment.clientId);
  }
  let newClients = 0;
  for (const clientId of activeInRange) if (firstVisit.get(clientId)! >= range.from) newClients++;
  return { newClients, returningClients: activeInRange.size - newClients };
}
