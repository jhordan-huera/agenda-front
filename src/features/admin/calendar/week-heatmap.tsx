import { WEEK_DAYS } from "@/lib/constants/business";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminCalendarDayTotals, AdminCalendarHourTotals, ISODate } from "@/types";
import { hourLabel, INTENSITY_CLASS, intensityLevel, visibleHours } from "./calendar-figures";

interface WeekHeatmapProps {
  /** Los 7 días, de lunes a domingo. */
  days: ISODate[];
  today: ISODate;
  hours: AdminCalendarHourTotals[];
  totals: Map<ISODate, AdminCalendarDayTotals>;
  onSelect: (date: ISODate, hour: number) => void;
}

const citas = (count: number) => (count === 1 ? "1 cita" : `${count} citas`);

/**
 * La semana del calendario de la plataforma (spec 035): las citas sin cancelar que empiezan en cada hora,
 * con el total de cada día y de cada hora. Es una tabla: cada casilla con citas abre el panel de esa hora.
 */
export function WeekHeatmap({ days, today, hours, totals, onSelect }: WeekHeatmapProps) {
  const byCell = new Map(hours.map((cell) => [`${cell.date} ${cell.hour}`, cell.appointments]));
  const countOf = (date: ISODate, hour: number) => byCell.get(`${date} ${hour}`) ?? 0;
  const rows = visibleHours(hours);
  const max = Math.max(0, ...hours.map((cell) => cell.appointments));
  const weekTotal = days.reduce((sum, day) => sum + (totals.get(day)?.appointments ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">
          Citas por hora, del {formatDate(days[0], "d 'de' MMMM")} al {formatDate(days[6], "d 'de' MMMM")}
        </caption>
        <colgroup>
          <col className="w-12 sm:w-16" />
          {days.map((day) => (
            <col key={day} />
          ))}
          <col className="w-10 sm:w-16" />
        </colgroup>
        <thead className="border-b bg-muted/50">
          <tr>
            <th scope="col" className="py-2 text-xs font-semibold text-muted-foreground">
              <span className="sr-only">Hora</span>
            </th>
            {days.map((day, index) => (
              <th key={day} scope="col" className="py-1.5 text-xs font-semibold text-muted-foreground">
                <span className="block">{WEEK_DAYS[index].short}</span>
                <span
                  className={cn(
                    "mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs font-medium text-foreground",
                    day === today && "bg-primary text-primary-foreground",
                  )}
                >
                  {formatDate(day, "d")}
                </span>
              </th>
            ))}
            <th scope="col" className="py-2 text-xs font-semibold text-muted-foreground">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((hour) => {
            const rowTotal = days.reduce((sum, day) => sum + countOf(day, hour), 0);
            return (
              <tr key={hour} className="border-b border-border/60 last:border-b-0">
                <th scope="row" className="py-0.5 text-[0.6875rem] font-medium text-muted-foreground tabular-nums sm:text-xs">
                  {hourLabel(hour)}
                </th>
                {days.map((day) => {
                  const count = countOf(day, hour);
                  return (
                    <td key={day} className="p-0.5">
                      {count > 0 ? (
                        <button
                          type="button"
                          onClick={() => onSelect(day, hour)}
                          aria-label={`${formatDate(day, "EEEE d 'de' MMMM")}, ${hourLabel(hour)}: ${citas(count)}`}
                          className={cn(
                            "flex h-8 w-full items-center justify-center rounded-md text-xs font-semibold tabular-nums outline-none hover:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:shadow-[inset_0_0_0_2px_var(--ring)] sm:h-9 sm:text-sm",
                            INTENSITY_CLASS[intensityLevel(count, max)],
                          )}
                        >
                          {count}
                        </button>
                      ) : (
                        <span aria-hidden className="block h-8 sm:h-9" />
                      )}
                    </td>
                  );
                })}
                <td className="text-center text-xs font-semibold text-muted-foreground tabular-nums">{rowTotal || ""}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t bg-muted/30">
          <tr>
            <th scope="row" className="py-2 text-xs font-semibold text-muted-foreground">
              Total
            </th>
            {days.map((day) => (
              <td key={day} className="py-2 text-center text-xs font-semibold tabular-nums sm:text-sm">
                {totals.get(day)?.appointments || ""}
              </td>
            ))}
            <td className="py-2 text-center text-xs font-bold tabular-nums sm:text-sm">{weekTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
