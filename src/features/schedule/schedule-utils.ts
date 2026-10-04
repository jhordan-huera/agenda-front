import { DEFAULT_WEEKLY_SCHEDULE, WEEK_DAYS } from "@/lib/constants/business";
import { capitalize, formatNumericDate, formatShortDate } from "@/lib/format";
import { addMinutesToTime, timeToMinutes } from "@/lib/time";
import { scheduleDaySchema, type ScheduleDayInput } from "@/lib/validations/schedule";
import type { BlockedTime, Schedule, TimeRange } from "@/types";

/** Semana completa (lunes → domingo) a partir de los horarios guardados. */
export function toWeekInputs(schedules: Schedule[]): ScheduleDayInput[] {
  return WEEK_DAYS.map(({ value }) => {
    const saved = schedules.find((schedule) => schedule.dayOfWeek === value);
    const fallback = DEFAULT_WEEKLY_SCHEDULE.find((day) => day.dayOfWeek === value)!;
    return saved
      ? { dayOfWeek: value, isActive: saved.isActive, intervals: saved.intervals.map((i) => ({ ...i })) }
      : { ...fallback, isActive: false, intervals: fallback.intervals.map((i) => ({ ...i })) };
  });
}

/** Errores de validación indexados por día de la semana. */
export function validateWeek(days: ScheduleDayInput[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const day of days) {
    const result = scheduleDaySchema.safeParse(day);
    if (!result.success) errors[day.dayOfWeek] = result.error.issues[0].message;
  }
  return errors;
}

/** Propone el siguiente intervalo (p. ej. tras 08:00–12:00 sugiere 14:00–18:00). */
export function suggestNextInterval(intervals: TimeRange[]): TimeRange {
  const last = intervals.at(-1);
  if (!last) return { start: "09:00", end: "13:00" };
  const startMinutes = Math.min(timeToMinutes(last.end) + 120, 22 * 60);
  const start = addMinutesToTime("00:00", startMinutes);
  const end = addMinutesToTime(start, Math.min(240, 23 * 60 + 45 - startMinutes));
  return { start, end };
}

/** "Vie 2 oct · 14:00 – 16:00" o "01/10/2026 – 05/10/2026 · Todo el día" */
export function describeBlockedTime(block: BlockedTime): string {
  const sameDay = block.startDate === block.endDate;
  const dates = sameDay
    ? capitalize(formatShortDate(block.startDate))
    : `${formatNumericDate(block.startDate)} – ${formatNumericDate(block.endDate)}`;
  return block.allDay ? `${dates} · Todo el día` : `${dates} · ${block.startTime} – ${block.endTime}`;
}
