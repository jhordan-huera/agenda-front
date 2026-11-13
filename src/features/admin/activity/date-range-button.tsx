import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DATE_PRESETS, describeRange, matchingPreset, presetRange, type DateRange } from "./date-range";

/** Hoy en el calendario del navegador: las fechas de la auditoría se cuentan en su hora (`toAuditQuery`). */
const browserToday = () => getZonedNow(Intl.DateTimeFormat().resolvedOptions().timeZone).date;

/**
 * Un solo botón para las fechas de /admin → Actividad (spec 049), en lugar de los dos campos: los atajos (Hoy,
 * Últimos 7 días, Últimos 30 días), Desde y Hasta, y «Cualquier fecha» para quitarlas.
 */
export function DateRangeButton({ value, onChange }: { value: DateRange; onChange: (next: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const today = browserToday();
  const label = describeRange(value, today);
  const preset = matchingPreset(value, today);
  const filtered = Boolean(value.from || value.to);

  const choose = (next: DateRange) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Fechas: ${label}`}
          className={cn("w-full justify-between font-normal sm:w-auto", filtered && "border-primary/40")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDays className="text-muted-foreground" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div role="group" aria-label="Atajos" className="grid gap-0.5">
          {DATE_PRESETS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={preset === option.value ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={preset === option.value}
              className="justify-start"
              onClick={() => choose(presetRange(option.value, today))}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t pt-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Desde
            <Input
              type="date"
              max={value.to || undefined}
              value={value.from}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Hasta
            <Input
              type="date"
              min={value.from || undefined}
              value={value.to}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
            />
          </label>
        </div>
        {filtered && (
          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => choose({ from: "", to: "" })}>
            Cualquier fecha
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
