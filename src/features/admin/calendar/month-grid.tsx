import { WEEK_DAYS } from "@/lib/constants/business";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminCalendarDayTotals, ISODate } from "@/types";
import { INTENSITY_CLASS, intensityLevel } from "./calendar-figures";

interface MonthGridProps {
  days: ISODate[];
  /** El mes que se ve ("2026-10"): los días de los meses de al lado van atenuados. */
  month: string;
  today: ISODate;
  totals: Map<ISODate, AdminCalendarDayTotals>;
  onSelect: (date: ISODate) => void;
}

const citas = (count: number) => (count === 1 ? "1 cita" : `${count} citas`);
const negocios = (count: number) => (count === 1 ? "1 negocio" : `${count} negocios`);

/**
 * El mes del calendario de la plataforma (spec 035): cada día con sus citas sin cancelar, en cuántos
 * negocios y las que siguen sin cerrar. El fondo se intensifica con las citas; tocar un día abre su panel.
 * Sobre el fondo, todo el texto va en el color del texto: el gris y la marca no llegan a 4,5:1 en los
 * días más llenos. «Sin cerrar» se distingue por el punto de la marca.
 */
export function MonthGrid({ days, month, today, totals, onSelect }: MonthGridProps) {
  const max = Math.max(0, ...days.filter((day) => day.startsWith(month)).map((day) => totals.get(day)?.appointments ?? 0));

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEK_DAYS.map((day) => (
          <div key={day.value} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {day.short}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 [grid-auto-rows:minmax(4.25rem,1fr)] sm:[grid-auto-rows:minmax(6.75rem,1fr)]">
        {days.map((day) => {
          const total = totals.get(day);
          const appointments = total?.appointments ?? 0;
          const inMonth = day.startsWith(month);
          const isToday = day === today;
          const hasAny = appointments + (total?.cancelled ?? 0) > 0;
          const unclosed = total?.unclosed ?? 0;
          const cell = cn(
            "flex min-w-0 flex-col items-start gap-0.5 border-r border-b p-1.5 text-left sm:gap-1 sm:p-2 [&:nth-child(7n)]:border-r-0",
            inMonth ? INTENSITY_CLASS[intensityLevel(appointments, max)] : "bg-muted/30 text-muted-foreground",
          );
          const content = (
            <>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium sm:size-7",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {formatDate(day, "d")}
              </span>
              {hasAny && (
                <>
                  <span className="px-0.5 text-base leading-none font-semibold tabular-nums sm:text-2xl">{appointments}</span>
                  <span className={cn("hidden px-0.5 text-xs sm:block", !inMonth && "text-muted-foreground")}>
                    {appointments === 0 ? "sólo canceladas" : `en ${negocios(total?.businesses ?? 0)}`}
                  </span>
                  {unclosed > 0 && (
                    <span className="flex items-center gap-1 px-0.5 text-[0.6875rem] leading-none font-medium">
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink" />
                      <span className="hidden sm:inline">{unclosed} sin cerrar</span>
                    </span>
                  )}
                </>
              )}
            </>
          );
          const label = `${formatDate(day, "EEEE d 'de' MMMM")}: ${citas(appointments)}${
            appointments > 0 ? ` en ${negocios(total?.businesses ?? 0)}` : ""
          }${total?.cancelled ? `, ${total.cancelled} canceladas` : ""}${unclosed ? `, ${unclosed} sin cerrar` : ""}`;

          return hasAny ? (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={label}
              className={cn(cell, "outline-none hover:shadow-[inset_0_0_0_2px_var(--ring)] focus-visible:shadow-[inset_0_0_0_2px_var(--ring)]")}
            >
              {content}
            </button>
          ) : (
            <div key={day} className={cell}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
