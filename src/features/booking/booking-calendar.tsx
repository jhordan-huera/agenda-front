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
  // Si la fecha elegida cambia sin tocar el calendario (p. ej. el día pedido ya pasó y se propone
  // el primer día con huecos, en otro mes), se muestra su mes.
  const [shownSelected, setShownSelected] = useState(selected);
  if (selected !== shownSelected) {
    setShownSelected(selected);
    if (selected && startOfMonthISO(selected) !== month) setMonth(startOfMonthISO(selected));
  }
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
        <p className="font-bold" aria-live="polite">
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
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
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
                "flex aspect-square items-center justify-center rounded-md tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                available ? "bg-accent font-bold text-ink hover:bg-[color-mix(in_oklch,var(--accent),var(--ink)_10%)]" : "text-muted-foreground/50",
                // El día elegido se marca con el resaltador (igual que la hora).
                isSelected && "bg-transparent hover:bg-transparent",
                day === today && "underline decoration-2 underline-offset-4",
              )}
            >
              <span className={cn(isSelected && "marker marker-sweep px-1.5 text-base font-extrabold")}>{formatDate(day, "d")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
