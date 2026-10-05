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

/** Horas libres del día. La elegida se marca con el resaltador, como en una agenda de papel. */
export function TimeSlots({ slots, selected, onSelect }: TimeSlotsProps) {
  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-10 text-center">
        <CalendarX2 className="size-6 text-muted-foreground" aria-hidden />
        <p className="mt-2 font-semibold">No quedan horas libres este día</p>
        <p className="text-sm text-muted-foreground">Elige otra fecha en el calendario.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {PERIODS.map((period) => {
        const periodSlots = slots.filter((slot) => period.test(timeToMinutes(slot)));
        if (periodSlots.length === 0) return null;
        return (
          <section key={period.label} aria-label={period.label}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{period.label}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {periodSlots.map((slot) => {
                const isSelected = slot === selected;
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(slot)}
                    className={cn(
                      "flex h-12 items-center justify-center rounded-md border bg-background text-lg font-bold text-ink tabular-nums transition-colors outline-none hover:border-ink focus-visible:ring-3 focus-visible:ring-ring/50",
                      isSelected && "border-ink",
                    )}
                  >
                    <span className={cn(isSelected && "marker marker-sweep")}>{slot}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
