import { capitalize, formatDate } from "@/lib/format";
import { addDaysISO } from "@/lib/time";
import type { ISODate } from "@/types";

/** Los atajos del botón de fechas de /admin → Actividad (spec 049). */
export type DatePreset = "today" | "last7" | "last30";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "last30", label: "Últimos 30 días" },
];

/** Desde y hasta, «YYYY-MM-DD» del calendario ("" = sin ese límite), como los filtros de la auditoría. */
export interface DateRange {
  from: string;
  to: string;
}

/** Las fechas de un atajo, contando hoy: «Últimos 7 días» es hoy y los 6 anteriores. */
export function presetRange(preset: DatePreset, today: ISODate): DateRange {
  const days = preset === "today" ? 0 : preset === "last7" ? 6 : 29;
  return { from: addDaysISO(today, -days), to: today };
}

/** El atajo que coincide con esas fechas, si alguno. */
export function matchingPreset(range: DateRange, today: ISODate): DatePreset | null {
  const match = DATE_PRESETS.find(({ value }) => {
    const preset = presetRange(value, today);
    return preset.from === range.from && preset.to === range.to;
  });
  return match?.value ?? null;
}

/** Lo que dice el botón: «Cualquier fecha», el atajo, «3 nov – 12 nov», «Desde 3 nov» o «Hasta 12 nov». */
export function describeRange(range: DateRange, today: ISODate): string {
  const { from, to } = range;
  if (!from && !to) return "Cualquier fecha";
  const preset = matchingPreset(range, today);
  if (preset) return DATE_PRESETS.find(({ value }) => value === preset)!.label;
  // Con el año en las dos puntas si alguna no es de este año («20 dic 2025 – 5 ene 2026»).
  const withYear = [from, to].some((day) => day && day.slice(0, 4) !== today.slice(0, 4));
  const short = (day: string) => formatDate(day, withYear ? "d MMM yyyy" : "d MMM");
  if (from && to) return from === to ? short(from) : `${short(from)} – ${short(to)}`;
  return from ? `Desde ${short(from)}` : `Hasta ${short(to)}`;
}

/**
 * El día a la izquierda de la lista de Acciones y Seguridad: «Hoy» y «viernes 13 nov», «Ayer» y «jueves 12 nov», o
 * el día de la semana y la fecha («Domingo» y «8 nov»; con el año si no es este).
 */
export function ledgerDay(date: ISODate, today: ISODate): { title: string; subtitle: string } {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  if (date === today || date === addDaysISO(today, -1)) {
    return { title: date === today ? "Hoy" : "Ayer", subtitle: formatDate(date, "EEEE d MMM") };
  }
  return { title: capitalize(formatDate(date, "EEEE")), subtitle: formatDate(date, sameYear ? "d MMM" : "d MMM yyyy") };
}
