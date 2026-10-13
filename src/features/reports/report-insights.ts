import { addDaysISO, getDayOfWeek, isPast, timeToMinutes, type ZonedNow } from "@/lib/time";
import type { Appointment, DayOfWeek, ISODate, Schedule } from "@/types";
import type { DateRange } from "./report-stats";

/**
 * Indicadores de Reportes que dicen qué hacer: de dónde llegan las citas, cuándo las piden, qué
 * pacientes vienen y faltan más y quiénes dejaron de venir. Funciones puras: el mismo archivo en el
 * front y en la beta.
 */

const active = (appointment: Appointment) => appointment.status !== "cancelled";
const byStart = (a: Appointment, b: Appointment) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

/* ------------------------------------------------------------ Página de reservas -- */

export interface BookingChannels {
  /** Citas no canceladas del periodo. */
  total: number;
  fromPage: number;
  fromPanel: number;
  /** Pacientes cuya primera visita fue en el periodo y llegó por la página. */
  newFromPage: number;
}

/** `firstVisits`: la primera cita no cancelada de cada paciente, con todo su historial. */
export function getBookingChannels(
  inRange: Appointment[],
  firstVisits: ReadonlyMap<string, ISODate | null>,
  range: DateRange,
): BookingChannels {
  const visits = inRange.filter(active);
  const fromPage = visits.filter((appointment) => appointment.source === "booking_page").length;
  const firstInRange = new Map<string, Appointment>();
  for (const appointment of visits.toSorted(byStart)) {
    if (!firstInRange.has(appointment.clientId)) firstInRange.set(appointment.clientId, appointment);
  }
  let newFromPage = 0;
  for (const [clientId, appointment] of firstInRange) {
    const first = firstVisits.get(clientId);
    const isNew = first !== undefined && first !== null && first >= range.from && first <= range.to;
    // Con el filtro de un profesional, su primera cita con él puede no ser su primera visita.
    if (isNew && appointment.date === first && appointment.source === "booking_page") newFromPage++;
  }
  return { total: visits.length, fromPage, fromPanel: visits.length - fromPage, newFromPage };
}

/* ------------------------------------------------------------ Días y horas -- */

/** Lunes primero. */
export const WEEK_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export interface Heatmap {
  /** Días con horario o con citas, de lunes a domingo. */
  days: DayOfWeek[];
  /** Horas del día (0–23) de la más temprana a la más tardía. */
  hours: number[];
  /** Citas no canceladas que empiezan en cada día y hora: clave "día-hora". */
  counts: Map<string, number>;
  max: number;
}

export const heatmapKey = (day: DayOfWeek, hour: number) => `${day}-${hour}`;

/** Cuántas citas empiezan cada día de la semana a cada hora (para ver cuándo piden más). */
export function getDemandHeatmap(inRange: Appointment[], schedules: Schedule[]): Heatmap {
  const counts = new Map<string, number>();
  const days = new Set<DayOfWeek>();
  let first = 24;
  let last = -1;
  for (const appointment of inRange.filter(active)) {
    const day = getDayOfWeek(appointment.date);
    const hour = Math.floor(timeToMinutes(appointment.startTime) / 60);
    counts.set(heatmapKey(day, hour), (counts.get(heatmapKey(day, hour)) ?? 0) + 1);
    days.add(day);
    first = Math.min(first, hour);
    last = Math.max(last, hour);
  }
  for (const schedule of schedules) {
    if (!schedule.isActive || schedule.intervals.length === 0) continue;
    days.add(schedule.dayOfWeek);
    for (const interval of schedule.intervals) {
      first = Math.min(first, Math.floor(timeToMinutes(interval.start) / 60));
      // Un horario hasta las 18:00 ocupa la hora de las 17.
      last = Math.max(last, Math.ceil(timeToMinutes(interval.end) / 60) - 1);
    }
  }
  const hours = last < first ? [] : Array.from({ length: last - first + 1 }, (_, index) => first + index);
  return { days: WEEK_ORDER.filter((day) => days.has(day)), hours, counts, max: Math.max(0, ...counts.values()) };
}

/* ------------------------------------------------------------ Pacientes destacados -- */

export interface ClientRank {
  clientId: string;
  /** Citas no canceladas del periodo. */
  appointments: number;
  completed: number;
  noShow: number;
  /** Suma de sus citas completadas. */
  spent: number;
  /** Completadas / (completadas + no asistió); null si aún no tiene citas pasadas. */
  attendance: number | null;
}

function rankClients(inRange: Appointment[]): ClientRank[] {
  const ranks = new Map<string, ClientRank>();
  for (const appointment of inRange.filter(active)) {
    const rank = ranks.get(appointment.clientId) ?? {
      clientId: appointment.clientId,
      appointments: 0,
      completed: 0,
      noShow: 0,
      spent: 0,
      attendance: null,
    };
    rank.appointments += 1;
    if (appointment.status === "completed") {
      rank.completed += 1;
      rank.spent += appointment.price;
    }
    if (appointment.status === "no_show") rank.noShow += 1;
    ranks.set(appointment.clientId, rank);
  }
  for (const rank of ranks.values()) {
    const attended = rank.completed + rank.noShow;
    rank.attendance = attended > 0 ? rank.completed / attended : null;
  }
  return [...ranks.values()];
}

/** Los que más vienen: más citas no canceladas en el periodo (a igualdad, más cobrado). */
export function getTopClients(inRange: Appointment[], limit = 5): ClientRank[] {
  return rankClients(inRange)
    .sort((a, b) => b.appointments - a.appointments || b.spent - a.spent)
    .slice(0, limit);
}

/** Los que más faltan sin avisar en el periodo (al menos una vez). */
export function getMostNoShows(inRange: Appointment[], limit = 5): ClientRank[] {
  return rankClients(inRange)
    .filter((rank) => rank.noShow > 0)
    .sort((a, b) => b.noShow - a.noShow || (a.attendance ?? 1) - (b.attendance ?? 1))
    .slice(0, limit);
}

/* ------------------------------------------------------------ No volvieron -- */

/** Lo que "no volvieron" necesita de cada paciente. El front lo arma con la API; la beta, con sus citas. */
export interface ClientVisits {
  clientId: string;
  /** Citas no canceladas (pasadas y futuras). */
  visits: number;
  /** Fecha de su primera cita no cancelada. */
  firstVisit: ISODate | null;
  /** Fecha de su última cita ya pasada y no cancelada. */
  lastVisit: ISODate | null;
  /** Tiene una cita activa por delante. */
  hasUpcoming: boolean;
}

/** El resumen por paciente con todas sus citas (lo usa la beta; en el front lo calcula la API). */
export function summarizeClientVisits(appointments: Appointment[], now: ZonedNow): ClientVisits[] {
  const summaries = new Map<string, ClientVisits>();
  for (const appointment of appointments) {
    const summary = summaries.get(appointment.clientId) ?? {
      clientId: appointment.clientId,
      visits: 0,
      firstVisit: null,
      lastVisit: null,
      hasUpcoming: false,
    };
    summaries.set(appointment.clientId, summary);
    if (!active(appointment)) continue;
    summary.visits += 1;
    if (!summary.firstVisit || appointment.date < summary.firstVisit) summary.firstVisit = appointment.date;
    if (isPast(appointment.date, appointment.startTime, now)) {
      if (!summary.lastVisit || appointment.date > summary.lastVisit) summary.lastVisit = appointment.date;
    } else if (appointment.status !== "no_show") {
      summary.hasUpcoming = true;
    }
  }
  return [...summaries.values()];
}

export const LAPSED_THRESHOLDS = [30, 60, 90] as const;
export type LapsedThreshold = (typeof LAPSED_THRESHOLDS)[number];

export interface LapsedClient {
  clientId: string;
  lastVisit: ISODate;
  visits: number;
}

/**
 * Pacientes que vinieron alguna vez y no han vuelto: su última cita fue hace más de `days` días y no
 * tienen ninguna por delante. Primero los que dejaron de venir hace menos (los más fáciles de
 * recuperar).
 */
export function getLapsedClients(
  visits: ClientVisits[],
  activeClientIds: ReadonlySet<string>,
  today: ISODate,
  days: number,
): LapsedClient[] {
  const cutoff = addDaysISO(today, -days);
  return visits
    .filter((visit) => visit.lastVisit !== null && visit.lastVisit < cutoff && !visit.hasUpcoming && activeClientIds.has(visit.clientId))
    .map((visit) => ({ clientId: visit.clientId, lastVisit: visit.lastVisit!, visits: visit.visits }))
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
}
