import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WEEK_DAYS } from "@/lib/constants/business";
import { capitalize, formatDate } from "@/lib/format";
import { addDaysISO, addMonthsISO, eachDayISO, endOfMonthISO, startOfMonthISO, startOfWeekISO } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ISODate } from "@/types";

interface BookingCalendarProps {
  today: ISODate;
  /** Última fecha reservable (hoy + anticipación máxima). */
  lastDate: ISODate;
  availableDates: Set<ISODate>;
  selected: ISODate | null;
  onSelect: (date: ISODate) => void;
}

/** Calendario mensual en el que sólo se pueden elegir días con horas libres. */
export function BookingCalendar({ today, lastDate, availableDates, selected, onSelect }: BookingCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonthISO(selected ?? today));
  const firstMonth = startOfMonthISO(today);
  const lastMonth = startOfMonthISO(lastDate);
  const days = eachDayISO(startOfWeekISO(month), addDaysISO(startOfWeekISO(endOfMonthISO(month)), 6));

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mes anterior"
          disabled={month <= firstMonth}
          onClick={() => setMonth(addMonthsISO(month, -1))}
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-semibold" aria-live="polite">
          {capitalize(formatDate(month, "MMMM yyyy"))}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mes siguiente"
          disabled={month >= lastMonth}
          onClick={() => setMonth(addMonthsISO(month, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground uppercase">
        {WEEK_DAYS.map((day) => (
          <span key={day.value} className="py-1.5">
            {day.short}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          if (!day.startsWith(month.slice(0, 7))) return <span key={day} aria-hidden />;
          const available = availableDates.has(day);
          const isSelected = day === selected;
          return (
            <button
              key={day}
              type="button"
              disabled={!available}
              aria-pressed={isSelected}
              aria-label={`${capitalize(formatDate(day, "EEEE d 'de' MMMM"))}${available ? "" : ", sin horas disponibles"}`}
              onClick={() => onSelect(day)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                available
                  ? "bg-accent/60 font-semibold text-accent-foreground hover:bg-primary/15"
                  : "text-muted-foreground/40",
                day === today && !isSelected && "ring-1 ring-primary/40",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {formatDate(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
