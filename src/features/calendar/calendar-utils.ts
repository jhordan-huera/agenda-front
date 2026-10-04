import { capitalize, formatDate, formatLongDate } from "@/lib/format";
import {
  addDaysISO,
  addMonthsISO,
  eachDayISO,
  endOfMonthISO,
  startOfMonthISO,
  startOfWeekISO,
  timeToMinutes,
} from "@/lib/time";
import type { Appointment, ISODate, Schedule } from "@/types";

export type CalendarView = "day" | "week" | "month";

export const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export function isCalendarView(value: string | null): value is CalendarView {
  return value === "day" || value === "week" || value === "month";
}

/** Días visibles para la vista (el mes incluye semanas completas de lunes a domingo). */
export function getVisibleDays(view: CalendarView, date: ISODate): ISODate[] {
  if (view === "day") return [date];
  if (view === "week") {
    const start = startOfWeekISO(date);
    return eachDayISO(start, addDaysISO(start, 6));
  }
  const start = startOfWeekISO(startOfMonthISO(date));
  const end = addDaysISO(startOfWeekISO(endOfMonthISO(date)), 6);
  return eachDayISO(start, end);
}

export function shiftDate(view: CalendarView, date: ISODate, direction: 1 | -1): ISODate {
  if (view === "day") return addDaysISO(date, direction);
  if (view === "week") return addDaysISO(date, 7 * direction);
  return addMonthsISO(date, direction);
}

export function getRangeLabel(view: CalendarView, date: ISODate): string {
  if (view === "day") return capitalize(formatLongDate(date));
  if (view === "month") return capitalize(formatDate(date, "MMMM yyyy"));

  const start = startOfWeekISO(date);
  const end = addDaysISO(start, 6);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return sameMonth
    ? `${formatDate(start, "d")} – ${formatDate(end, "d 'de' MMMM yyyy")}`
    : `${formatDate(start, "d MMM")} – ${formatDate(end, "d MMM yyyy")}`;
}

/** Franja horaria a mostrar: cubre el horario de atención y las citas visibles. */
export function getHourRange(schedules: Schedule[], appointments: Appointment[]): { startHour: number; endHour: number } {
  const starts = [
    ...schedules.filter((s) => s.isActive).flatMap((s) => s.intervals.map((i) => timeToMinutes(i.start))),
    ...appointments.map((a) => timeToMinutes(a.startTime)),
  ];
  const ends = [
    ...schedules.filter((s) => s.isActive).flatMap((s) => s.intervals.map((i) => timeToMinutes(i.end))),
    ...appointments.map((a) => timeToMinutes(a.endTime)),
  ];
  const startHour = starts.length ? Math.floor(Math.min(...starts) / 60) : 8;
  const endHour = ends.length ? Math.ceil(Math.max(...ends) / 60) : 18;
  return { startHour: Math.max(0, Math.min(startHour, 8)), endHour: Math.min(24, Math.max(endHour, startHour + 8, 18)) };
}

export interface PositionedEvent<T> {
  item: T;
  start: number;
  end: number;
  /** Columna asignada dentro del grupo de citas que se solapan. */
  lane: number;
  lanes: number;
}

/** Reparte en columnas las citas que se solapan para que no se tapen entre sí. */
export function layoutDayEvents<T extends { startTime: string; endTime: string }>(items: T[]): PositionedEvent<T>[] {
  const events = items
    .map((item) => ({ item, start: timeToMinutes(item.startTime), end: timeToMinutes(item.endTime), lane: 0, lanes: 1 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const positioned: PositionedEvent<T>[] = [];
  let cluster: typeof events = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    for (const event of cluster) event.lanes = laneEnds.length;
    positioned.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const event of events) {
    if (event.start >= clusterEnd) closeCluster();
    const freeLane = laneEnds.findIndex((end) => end <= event.start);
    event.lane = freeLane === -1 ? laneEnds.length : freeLane;
    laneEnds[event.lane] = event.end;
    clusterEnd = Math.max(clusterEnd, event.end);
    cluster.push(event);
  }
  closeCluster();
  return positioned;
}
