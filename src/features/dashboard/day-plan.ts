import { getWorkingRanges } from "@/lib/availability";
import { addDaysISO, timeToMinutes, type ZonedNow } from "@/lib/time";
import type { Appointment, BlockedTime, ISODate, Schedule } from "@/types";

/** Cálculos del día para el Inicio: límites de la jornada, bloqueos y cuánto falta para una cita. */

export interface MinuteSpan {
  start: number;
  end: number;
}

/** Cuánto falta para una cita, en palabras: "En 25 min", "En 2 h 10 min", "Mañana"… */
export function untilLabel(appointment: Appointment, now: ZonedNow): string {
  if (appointment.date === now.date) {
    const diff = timeToMinutes(appointment.startTime) - now.minutes;
    if (diff <= 0) return "En curso";
    if (diff < 60) return `En ${diff} min`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return minutes ? `En ${hours} h ${minutes} min` : `En ${hours} h`;
  }
  return appointment.date === addDaysISO(now.date, 1) ? "Mañana" : "";
}

export function blocksOn(blockedTimes: BlockedTime[], date: ISODate): (MinuteSpan & { reason: string })[] {
  return blockedTimes
    .filter((block) => block.startDate <= date && date <= block.endDate)
    .map((block) => ({
      start: block.allDay || !block.startTime ? 0 : timeToMinutes(block.startTime),
      end: block.allDay || !block.endTime ? 24 * 60 : timeToMinutes(block.endTime),
      reason: block.reason,
    }));
}

/** La jornada del día: el horario de atención y las citas, redondeados a horas enteras. */
export function dayBounds(date: ISODate, appointments: Appointment[], schedules: Schedule[]): MinuteSpan | null {
  const working = getWorkingRanges(schedules, date);
  const starts = [...working.map((range) => range.start), ...appointments.map((a) => timeToMinutes(a.startTime))];
  const ends = [...working.map((range) => range.end), ...appointments.map((a) => timeToMinutes(a.endTime))];
  if (starts.length === 0) return null;
  return { start: Math.floor(Math.min(...starts) / 60) * 60, end: Math.ceil(Math.max(...ends) / 60) * 60 };
}

/** Horas enteras libres que quedan hoy dentro del horario (sin citas ni bloqueos). */
export function freeHoursLeft(
  date: ISODate,
  appointments: Appointment[],
  schedules: Schedule[],
  blockedTimes: BlockedTime[],
  fromMinutes: number,
): number {
  const working = getWorkingRanges(schedules, date);
  const blocks = blocksOn(blockedTimes, date);
  const busy = appointments.map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) }));
  let free = 0;
  for (const range of working) {
    for (let hour = Math.ceil(Math.max(range.start, fromMinutes) / 60) * 60; hour + 60 <= range.end; hour += 60) {
      const overlaps = (span: MinuteSpan) => span.start < hour + 60 && span.end > hour;
      if (!busy.some(overlaps) && !blocks.some(overlaps)) free++;
    }
  }
  return free;
}
