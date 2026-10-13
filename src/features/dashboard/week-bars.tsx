import { Link } from "react-router";
import { WEEK_DAYS } from "@/lib/constants/business";
import { formatDate, plural } from "@/lib/format";
import { addDaysISO, startOfWeekISO, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";
import { DashCard, DashCardHeader } from "./dash-card";

/**
 * La semana en barras: cuántas citas tiene cada día (sin canceladas). Cada día con su columna de
 * fondo; hoy, la barra en degradado de la marca y su cifra en una etiqueta oscura.
 */
export function WeekBars({ appointments, now }: { appointments: Appointment[]; now: ZonedNow }) {
  const monday = startOfWeekISO(now.date);
  const days = WEEK_DAYS.map((day, index) => {
    const date = addDaysISO(monday, index);
    const count = appointments.filter((a) => a.date === date && a.status !== "cancelled").length;
    return { date, short: day.short, count };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <DashCard aria-labelledby="week-heading">
      <DashCardHeader id="week-heading" title="Esta semana" aside={<span className="font-semibold">{plural(total, "cita", "citas")}</span>} />
      <ol className="grid h-44 grid-cols-7 items-end gap-2" aria-label="Citas por día de esta semana">
        {days.map((day) => {
          const today = day.date === now.date;
          return (
            <li key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
              <span aria-hidden className="flex w-full flex-1 flex-col items-center justify-end rounded-lg bg-muted px-1 pt-1">
                <span
                  className={cn(
                    "mb-1 text-[11px] leading-none font-bold tabular-nums",
                    today ? "rounded-md bg-shell px-1.5 py-1 text-white" : "text-muted-foreground",
                  )}
                >
                  {day.count || ""}
                </span>
                <span
                  className={cn("w-full rounded-md", today ? "bg-linear-to-t from-ink to-lilac-ink" : "bg-chart-2")}
                  style={{ height: day.count ? `${Math.max(6, (day.count / max) * 74)}%` : "0" }}
                />
              </span>
              <span className={cn("text-xs", today ? "font-bold text-ink" : "text-muted-foreground")}>
                <span className="sr-only">
                  {formatDate(day.date, "EEEE d")}: {plural(day.count, "cita", "citas")}
                </span>
                <span aria-hidden>{day.short.slice(0, 2)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <Link to="/dashboard/calendar" className="mt-4 inline-block text-sm font-semibold text-ink underline-offset-4 hover:underline">
        Ver la semana en la agenda
      </Link>
    </DashCard>
  );
}
