import { Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WEEK_DAYS } from "@/lib/constants/business";
import { cn } from "@/lib/utils";
import type { ScheduleDayInput } from "@/lib/validations/schedule";
import type { TimeRange } from "@/types";
import { suggestNextInterval } from "./schedule-utils";

interface WeeklyScheduleEditorProps {
  value: ScheduleDayInput[];
  onChange: (value: ScheduleDayInput[]) => void;
  errors?: Record<number, string>;
}

export function WeeklyScheduleEditor({ value, onChange, errors = {} }: WeeklyScheduleEditorProps) {
  const updateDay = (dayOfWeek: number, patch: Partial<ScheduleDayInput>) =>
    onChange(value.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)));

  const updateInterval = (day: ScheduleDayInput, index: number, patch: Partial<TimeRange>) =>
    updateDay(day.dayOfWeek, {
      intervals: day.intervals.map((interval, i) => (i === index ? { ...interval, ...patch } : interval)),
    });

  const copyToActiveDays = (source: ScheduleDayInput) =>
    onChange(
      value.map((day) =>
        day.isActive ? { ...day, intervals: source.intervals.map((interval) => ({ ...interval })) } : day,
      ),
    );

  return (
    <div className="divide-y rounded-xl border bg-background">
      {value.map((day) => {
        const { label } = WEEK_DAYS.find((d) => d.value === day.dayOfWeek)!;
        const error = errors[day.dayOfWeek];
        const switchId = `day-${day.dayOfWeek}`;

        return (
          <div key={day.dayOfWeek} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <div className="flex h-8 w-36 shrink-0 items-center gap-3">
              <Switch
                id={switchId}
                checked={day.isActive}
                onCheckedChange={(isActive) =>
                  updateDay(day.dayOfWeek, {
                    isActive,
                    intervals: day.intervals.length ? day.intervals : [{ start: "09:00", end: "17:00" }],
                  })
                }
              />
              <label htmlFor={switchId} className={cn("text-sm font-medium", !day.isActive && "text-muted-foreground")}>
                {label}
              </label>
            </div>

            {day.isActive ? (
              <div className="flex-1 space-y-2">
                {day.intervals.map((interval, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      step={900}
                      aria-label={`${label}: hora inicial del intervalo ${index + 1}`}
                      className="w-28"
                      value={interval.start}
                      onChange={(e) => updateInterval(day, index, { start: e.target.value })}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      type="time"
                      step={900}
                      aria-label={`${label}: hora final del intervalo ${index + 1}`}
                      className="w-28"
                      value={interval.end}
                      onChange={(e) => updateInterval(day, index, { end: e.target.value })}
                    />
                    {day.intervals.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar intervalo"
                        onClick={() =>
                          updateDay(day.dayOfWeek, { intervals: day.intervals.filter((_, i) => i !== index) })
                        }
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:text-primary"
                    onClick={() =>
                      updateDay(day.dayOfWeek, { intervals: [...day.intervals, suggestNextInterval(day.intervals)] })
                    }
                  >
                    <Plus /> Agregar intervalo
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => copyToActiveDays(day)}>
                        <Copy /> Aplicar a todos
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copia este horario a todos los días activos</TooltipContent>
                  </Tooltip>
                </div>
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
              </div>
            ) : (
              <p className="flex h-8 items-center text-sm text-muted-foreground">Cerrado</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
