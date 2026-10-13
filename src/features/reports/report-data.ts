import type { BlockedRange } from "@/lib/availability";
import type { Appointment, ISODate, Schedule, Service } from "@/types";
import { getBookingChannels, getDemandHeatmap, getMostNoShows, getTopClients } from "./report-insights";
import type { ResolvedPeriod } from "./report-period";
import {
  filterByRange,
  getClientRetention,
  getProfessionalBreakdown,
  getRevenueSnapshot,
  getStatusBreakdown,
  getTopServices,
  getTotalOccupancy,
  getVolumeSeries,
  summarize,
  volumeGranularity,
} from "./report-stats";

export interface ReportInput {
  /** Las citas cargadas, ya filtradas por el profesional elegido (si se eligió uno). */
  appointments: Appointment[];
  /** Primera cita no cancelada de cada paciente, con todo su historial. */
  firstVisits: ReadonlyMap<string, ISODate | null>;
  period: ResolvedPeriod;
  today: ISODate;
  servicesById: Map<string, Service>;
  /** Agendas de la ocupación y de la tabla por profesional. */
  agendaIds: string[];
  schedules: Schedule[];
  blockedTimes: BlockedRange[];
}

/** Todo lo que muestran Reportes y su documento impreso, del periodo y del de comparación. */
export function buildReport({ appointments, firstVisits, period, today, servicesById, agendaIds, schedules, blockedTimes }: ReportInput) {
  const inRange = filterByRange(appointments, period.range);
  const inPrevious = filterByRange(appointments, period.previous);
  const byProfessional = getProfessionalBreakdown(inRange, period.range, agendaIds, schedules, blockedTimes);
  const previousByProfessional = getProfessionalBreakdown(inPrevious, period.previous, agendaIds, schedules, blockedTimes);
  const granularity = volumeGranularity(period.range);
  const summary = summarize(inRange);
  return {
    summary,
    previousSummary: summarize(inPrevious),
    hasPrevious: inPrevious.length > 0,
    granularity,
    volume: getVolumeSeries(inRange, period.range, granularity),
    statuses: getStatusBreakdown(summary),
    topServices: getTopServices(inRange, servicesById),
    revenue: getRevenueSnapshot(appointments, today),
    retention: getClientRetention(inRange, firstVisits, period.range),
    previousRetention: getClientRetention(inPrevious, firstVisits, period.previous),
    channels: getBookingChannels(inRange, firstVisits, period.range),
    previousChannels: getBookingChannels(inPrevious, firstVisits, period.previous),
    byProfessional,
    occupancy: getTotalOccupancy(byProfessional),
    previousOccupancy: getTotalOccupancy(previousByProfessional),
    heatmap: getDemandHeatmap(
      inRange,
      schedules.filter((schedule) => agendaIds.includes(schedule.professionalId)),
    ),
    topClients: getTopClients(inRange),
    noShows: getMostNoShows(inRange),
  };
}

export type ReportData = ReturnType<typeof buildReport>;
