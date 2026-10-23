import type { AdminCalendarDayTotals } from "@/types";

/*
 * El calendario de la plataforma (spec 035): la intensidad del fondo de cada día u hora y las horas que se
 * muestran en la semana. Son funciones puras, sin React, para probarlas con `npm run check:admin-calendar`.
 */

/** 0: sin citas; del 1 al 4, de menos a más frente al día (o la hora) con más citas del periodo. */
export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export function intensityLevel(count: number, max: number): IntensityLevel {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((4 * count) / max))) as IntensityLevel;
}

/**
 * El fondo de cada nivel: la marca mezclada con la tarjeta, una sola gama. El número va siempre escrito
 * encima, así que el color nunca es lo único que lo dice.
 */
export const INTENSITY_CLASS: Record<IntensityLevel, string> = {
  0: "",
  1: "bg-[color-mix(in_oklch,var(--primary)_9%,var(--card))]",
  2: "bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))]",
  3: "bg-[color-mix(in_oklch,var(--primary)_24%,var(--card))]",
  4: "bg-[color-mix(in_oklch,var(--primary)_32%,var(--card))]",
};

/** Las horas que la semana muestra siempre; se amplían si hay citas antes o después. */
export const WEEK_HOURS = { first: 7, last: 20 } as const;

export function visibleHours(hours: { hour: number }[]): number[] {
  const first = Math.min(WEEK_HOURS.first, ...hours.map(({ hour }) => hour));
  const last = Math.max(WEEK_HOURS.last, ...hours.map(({ hour }) => hour));
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** Las citas y las sin cerrar de los días que cumplen `include` (el mes que se ve, sin los días de al lado). */
export function totalsOf(days: AdminCalendarDayTotals[], include: (date: string) => boolean): { appointments: number; unclosed: number } {
  return days.reduce(
    (total, day) =>
      include(day.date) ? { appointments: total.appointments + day.appointments, unclosed: total.unclosed + day.unclosed } : total,
    { appointments: 0, unclosed: 0 },
  );
}
