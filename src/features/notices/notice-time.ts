import { capitalize, formatClockTime, formatShortDate, toZonedDate } from "@/lib/format";
import { addDaysISO, getZonedNow } from "@/lib/time";
import type { ISODate, PanelNotice } from "@/types";

/**
 * Las fechas de la campana (spec 014), en la zona del negocio (en /admin, la de la plataforma): «hace
 * cuánto» en la lista y los días de la página «Avisos».
 */

/** «ahora», «hace 5 min», «hace 2 h», «ayer» o «mar 13 oct». */
export function timeAgo(iso: string, timezone: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const today = getZonedNow(timezone, now).date;
  const day = toZonedDate(iso, timezone);
  if (day === today) return `hace ${Math.floor(minutes / 60)} h`;
  if (day === addDaysISO(today, -1)) return "ayer";
  return formatShortDate(day);
}

/** En la página, dentro de su día: «hace 5 min» si es de hoy y la hora («16:05») si no. */
export function timeInDay(iso: string, timezone: string, now: Date = new Date()): string {
  return toZonedDate(iso, timezone) === getZonedNow(timezone, now).date ? timeAgo(iso, timezone, now) : formatClockTime(iso, timezone);
}

export interface NoticeDay {
  date: ISODate;
  /** «Hoy», «Ayer» o «Mar 13 oct». */
  label: string;
  notices: PanelNotice[];
}

/** Los avisos (del más nuevo al más viejo) agrupados por día. */
export function groupNoticesByDay(notices: PanelNotice[], timezone: string, now: Date = new Date()): NoticeDay[] {
  const today = getZonedNow(timezone, now).date;
  const days: NoticeDay[] = [];
  for (const notice of notices) {
    const date = toZonedDate(notice.createdAt, timezone);
    let day = days.at(-1);
    if (!day || day.date !== date) {
      day = { date, label: date === today ? "Hoy" : date === addDaysISO(today, -1) ? "Ayer" : capitalize(formatShortDate(date)), notices: [] };
      days.push(day);
    }
    day.notices.push(notice);
  }
  return days;
}
