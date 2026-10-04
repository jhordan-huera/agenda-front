import { CalendarX2 } from "lucide-react";
import { timeToMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "Mañana", test: (minutes: number) => minutes < 12 * 60 },
  { label: "Tarde", test: (minutes: number) => minutes >= 12 * 60 && minutes < 18 * 60 },
  { label: "Noche", test: (minutes: number) => minutes >= 18 * 60 },
];

interface TimeSlotsProps {
  slots: string[];
  selected: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlots({ slots, selected, onSelect }: TimeSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-10 text-center">
        <CalendarX2 className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">No hay horas disponibles este día</p>
        <p className="text-xs text-muted-foreground">Prueba con otra fecha.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PERIODS.map((period) => {
        const periodSlots = slots.filter((slot) => period.test(timeToMinutes(slot)));
        if (periodSlots.length === 0) return null;
        return (
          <section key={period.label} aria-label={period.label}>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{period.label}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {periodSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={slot === selected}
                  onClick={() => onSelect(slot)}
                  className={cn(
                    "h-10 rounded-lg border bg-background text-sm font-medium tabular-nums transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
                    slot === selected && "border-primary bg-primary text-primary-foreground hover:text-primary-foreground",
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
