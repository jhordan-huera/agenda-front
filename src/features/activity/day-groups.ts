import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { capitalize, formatDate, toZonedDate } from "@/lib/format";
import { addDaysISO, getZonedNow } from "@/lib/time";
import type { ISODate } from "@/types";

export interface DayGroup<T> {
  date: ISODate;
  /** «Hoy», «Ayer» o «Martes 12 de octubre» (con el año si no es este). */
  label: string;
  items: T[];
}

function dayLabel(date: ISODate, today: ISODate): string {
  if (date === today) return "Hoy";
  if (date === addDaysISO(today, -1)) return "Ayer";
  return capitalize(formatDate(date, date.slice(0, 4) === today.slice(0, 4) ? "EEEE d 'de' MMMM" : "EEEE d 'de' MMMM 'de' yyyy"));
}

/**
 * Agrupa por día una lista ya ordenada de la más nueva a la más vieja (auditoría y emails del panel de
 * plataforma, spec 007), en la zona horaria indicada.
 */
export function groupItemsByDay<T>(items: T[], at: (item: T) => string, timezone: string = DEFAULT_TIMEZONE): DayGroup<T>[] {
  const today = getZonedNow(timezone).date;
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = toZonedDate(at(item), timezone);
    let group = groups.at(-1);
    if (!group || group.date !== date) {
      group = { date, label: dayLabel(date, today), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
