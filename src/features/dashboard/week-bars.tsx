import { Link } from "react-router";
import { WEEK_DAYS } from "@/lib/constants/business";
import { formatDate, plural } from "@/lib/format";
import { addDaysISO, startOfWeekISO, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

/** La semana en barras: cuántas citas tiene cada día (sin canceladas). Hoy va en azul. */
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
    <section aria-labelledby="week-heading">
      <div className="flex items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
        <h2 id="week-heading" className="font-bold">
          Esta semana
        </h2>
        <span className="text-sm font-semibold text-muted-foreground">{plural(total, "cita", "citas")}</span>
      </div>
      <ol className="mt-4 grid h-36 grid-cols-7 items-end gap-1.5" aria-label="Citas por día de esta semana">
        {days.map((day) => {
          const today = day.date === now.date;
          return (
            <li key={day.date} className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className={cn("h-4 text-xs font-bold tabular-nums", today ? "text-ink" : "text-muted-foreground")}>
                {day.count || ""}
              </span>
              <span aria-hidden className="flex w-full flex-1 items-end">
                <span
                  className={cn("w-full rounded-t-md", today ? "bg-ink" : "bg-chart-2/70", day.count === 0 && "bg-border")}
                  style={{ height: day.count ? `${Math.max(8, (day.count / max) * 100)}%` : "3px" }}
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
      <Link to="/dashboard/calendar" className="mt-3 inline-block text-sm font-semibold text-ink underline-offset-4 hover:underline">
        Ver la semana en la agenda
      </Link>
    </section>
  );
}
