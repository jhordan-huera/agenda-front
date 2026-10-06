import { APPOINTMENT_STATUSES, REVENUE_STATUSES } from "@/lib/constants/appointment-status";
import { formatDate } from "@/lib/format";
import { getBlockedRanges, getWorkingRanges, type BlockedRange } from "@/lib/availability";
import { addDaysISO, eachDayISO, startOfWeekISO, timeToMinutes } from "@/lib/time";
import type { Appointment, AppointmentStatus, ISODate, Schedule, Service } from "@/types";

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

/**
 * `firstVisits`: la primera cita no cancelada de cada cliente (la calcula la API con todo el
 * historial; aquí sólo llegan las citas del periodo).
 */
export function getClientRetention(
  appointmentsInRange: Appointment[],
  firstVisits: ReadonlyMap<string, ISODate | null>,
  range: DateRange,
): ClientRetention {
  const activeInRange = new Set<string>();
  for (const appointment of appointmentsInRange) {
    if (appointment.status === "cancelled") continue;
    if (appointment.date >= range.from && appointment.date <= range.to) activeInRange.add(appointment.clientId);
  }
  let newClients = 0;
  for (const clientId of activeInRange) {
    const first = firstVisits.get(clientId);
    if (!first || first >= range.from) newClients++;
  }
  return { newClients, returningClients: activeInRange.size - newClients };
}

/**
 * Citas que necesitan los reportes: el periodo elegido más la semana y el mes en curso (los
 * ingresos de "Hoy", "Esta semana" y "Este mes"). Nunca el historial completo.
 */
export function getReportFetchRange(today: ISODate, days: ReportPeriod): DateRange {
  const period = getPeriodRange(today, days);
  const weekStart = startOfWeekISO(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = addDaysISO(`${addDaysISO(monthStart, 32).slice(0, 7)}-01`, -1);
  const weekEnd = addDaysISO(weekStart, 6);
  return {
    from: [period.from, weekStart, monthStart].sort()[0],
    to: [period.to, weekEnd, monthEnd].sort().at(-1)!,
  };
}

export interface ProfessionalReport {
  professionalId: string;
  summary: ReportSummary;
  /**
   * Ocupación: minutos con citas (no canceladas) sobre los minutos de su horario en el periodo, sin
   * los bloqueos. Con el horario actual (no el que tenía antes). null si no tiene horario.
   */
  occupancy: number | null;
}

/** Minutos de `range` tapados por los bloqueos (los bloqueos que se pisan cuentan una vez cada uno). */
function blockedMinutes(range: { start: number; end: number }, blocked: { start: number; end: number }[]): number {
  return blocked.reduce((sum, block) => sum + Math.max(0, Math.min(range.end, block.end) - Math.max(range.start, block.start)), 0);
}

/** Reporte de cada agenda en el periodo: citas por estado, ingresos y ocupación de su horario. */
export function getProfessionalBreakdown(
  appointmentsInRange: Appointment[],
  range: DateRange,
  professionalIds: string[],
  schedules: Schedule[],
  blockedTimes: BlockedRange[],
): ProfessionalReport[] {
  return professionalIds.map((professionalId) => {
    const own = appointmentsInRange.filter((appointment) => appointment.professionalId === professionalId);
    const ownSchedules = schedules.filter((schedule) => schedule.professionalId === professionalId);
    const ownBlocks = blockedTimes.filter((block) => block.professionalId === null || block.professionalId === professionalId);
    let available = 0;
    for (const day of eachDayISO(range.from, range.to)) {
      const blocked = getBlockedRanges(ownBlocks, day);
      for (const working of getWorkingRanges(ownSchedules, day)) {
        available += Math.max(0, working.end - working.start - blockedMinutes(working, blocked));
      }
    }
    const booked = own
      .filter((appointment) => appointment.status !== "cancelled")
      .reduce((sum, appointment) => sum + timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime), 0);
    return { professionalId, summary: summarize(own), occupancy: available > 0 ? Math.min(1, booked / available) : null };
  });
}

