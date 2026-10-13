import { formatDate } from "@/lib/format";
import { addDaysISO, addMonthsISO, daysBetween, endOfMonthISO, startOfMonthISO, startOfWeekISO } from "@/lib/time";
import type { ISODate } from "@/types";
import type { DateRange } from "./report-stats";

/**
 * El periodo de los reportes y con qué se compara: los últimos días, un mes o unas fechas. Cada
 * periodo se compara con el anterior del mismo largo (el mes, con el mes anterior; el mes en curso,
 * con los mismos días del mes anterior).
 */

export const REPORT_DAY_OPTIONS = [7, 30, 90] as const;
export const MAX_RANGE_DAYS = 366;

export type ReportPeriodChoice =
  | { kind: "days"; days: (typeof REPORT_DAY_OPTIONS)[number] }
  /** "2026-09" */
  | { kind: "month"; month: string }
  | { kind: "range"; from: ISODate; to: ISODate };

export interface ResolvedPeriod {
  range: DateRange;
  previous: DateRange;
  /** "Del 1 al 13 de octubre de 2026" */
  label: string;
  /** "del 1 al 13 de septiembre" */
  previousLabel: string;
}

const lengthOf = (range: DateRange) => daysBetween(range.from, range.to) + 1;
const minDate = (a: ISODate, b: ISODate) => (a < b ? a : b);

/** El rango del mismo largo justo antes. */
function previousOf(range: DateRange): DateRange {
  const days = lengthOf(range);
  return { from: addDaysISO(range.from, -days), to: addDaysISO(range.from, -1) };
}

/** "1 al 13 de octubre de 2026", "14 de septiembre al 13 de octubre de 2026", con o sin el año. */
function describeRange({ from, to }: DateRange, withYear: boolean): string {
  const year = withYear ? " 'de' yyyy" : "";
  if (from === to) return formatDate(from, `d 'de' MMMM${year}`);
  if (from.slice(0, 4) !== to.slice(0, 4)) return `${formatDate(from, "d 'de' MMMM 'de' yyyy")} al ${formatDate(to, "d 'de' MMMM 'de' yyyy")}`;
  if (from.slice(0, 7) === to.slice(0, 7)) return `${formatDate(from, "d")} al ${formatDate(to, `d 'de' MMMM${year}`)}`;
  return `${formatDate(from, "d 'de' MMMM")} al ${formatDate(to, `d 'de' MMMM${year}`)}`;
}

function describe(range: DateRange, previous: DateRange): Pick<ResolvedPeriod, "label" | "previousLabel"> {
  const single = range.from === range.to;
  return {
    label: `${single ? "El" : "Del"} ${describeRange(range, true)}`,
    previousLabel: `${previous.from === previous.to ? "el" : "del"} ${describeRange(previous, previous.from.slice(0, 4) !== range.to.slice(0, 4))}`,
  };
}

export function resolvePeriod(choice: ReportPeriodChoice, today: ISODate): ResolvedPeriod {
  let range: DateRange;
  let previous: DateRange;
  if (choice.kind === "days") {
    range = { from: addDaysISO(today, -(choice.days - 1)), to: today };
    previous = previousOf(range);
  } else if (choice.kind === "month") {
    const start = `${choice.month}-01`;
    const previousStart = addMonthsISO(start, -1);
    if (choice.month === today.slice(0, 7)) {
      // Lo que va del mes, contra los mismos días del mes anterior (sin pasar de su último día).
      range = { from: start, to: today };
      previous = { from: previousStart, to: minDate(addDaysISO(previousStart, daysBetween(start, today)), endOfMonthISO(previousStart)) };
    } else {
      range = { from: start, to: endOfMonthISO(start) };
      previous = { from: previousStart, to: endOfMonthISO(previousStart) };
    }
  } else {
    range = { from: choice.from, to: choice.to };
    previous = previousOf(range);
  }
  return { range, previous, ...describe(range, previous) };
}

/** null si las fechas sirven; si no, por qué. */
export function rangeError(from: ISODate | "", to: ISODate | ""): string | null {
  if (!from || !to) return "Elige las dos fechas.";
  if (to < from) return "La fecha final es anterior a la inicial.";
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) return `Elige como máximo ${MAX_RANGE_DAYS} días (un año).`;
  return null;
}

/** Los últimos meses, del más reciente al más antiguo: { value: "2026-10", label: "octubre 2026" }. */
export function recentMonths(today: ISODate, count = 24): { value: string; label: string }[] {
  const current = startOfMonthISO(today);
  return Array.from({ length: count }, (_, index) => {
    const start = addMonthsISO(current, -index);
    return { value: start.slice(0, 7), label: formatDate(start, "MMMM yyyy") };
  });
}

/**
 * Las citas que hay que pedir: el periodo, el de comparación y la semana y el mes en curso (los
 * ingresos de "Hoy", "Esta semana" y "Este mes"). Nunca el historial completo.
 */
export function getReportFetchRange(period: ResolvedPeriod, today: ISODate): DateRange {
  const weekStart = startOfWeekISO(today);
  const monthStart = startOfMonthISO(today);
  return {
    from: [period.previous.from, weekStart, monthStart].sort()[0],
    to: [period.range.to, addDaysISO(weekStart, 6), endOfMonthISO(today)].sort().at(-1)!,
  };
}

export interface Comparison {
  /**
   * "relative": cambio en proporción (0,18 = 18 % más); "points": diferencia de dos porcentajes
   * (0,1 = 10 puntos más). null: el anterior fue 0 y no hay porcentaje.
   */
  delta: number | null;
  kind: "relative" | "points";
  /** Si el cambio es bueno; null si no cambió. */
  favorable: boolean | null;
}

/**
 * Cambio frente al periodo anterior. `better`: si es bueno que suba (ingresos, citas) o que baje
 * (cancelaciones, faltas). Para porcentajes (asistencia, ocupación) se usa `kind: "points"`.
 */
export function compareValues(
  current: number,
  previous: number,
  better: "up" | "down",
  kind: Comparison["kind"] = "relative",
): Comparison {
  const difference = current - previous;
  const favorable = difference === 0 ? null : (difference > 0) === (better === "up");
  if (kind === "points") return { delta: difference, kind, favorable };
  if (previous === 0) return { delta: current === 0 ? 0 : null, kind, favorable };
  return { delta: difference / previous, kind, favorable };
}
