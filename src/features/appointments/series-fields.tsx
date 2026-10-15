import { Repeat } from "lucide-react";
import { useId } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SERIES_FREQUENCY_LABELS, SERIES_MAX, SERIES_MIN } from "@/lib/appointment-series";
import type { AppointmentSeriesFrequency } from "@/types";

/** «Repetir» de una cita nueva (spec 011): encendido, cada cuánto y cuántas citas (contando la primera). */
export interface SeriesRepeatValue {
  enabled: boolean;
  frequency: AppointmentSeriesFrequency;
  /** Texto: lo que se escribe en el campo (se valida con seriesRepeatSchema). */
  count: string;
}

const FREQUENCIES = Object.entries(SERIES_FREQUENCY_LABELS) as [AppointmentSeriesFrequency, string][];

/**
 * «Repetir» en «Nueva cita»: al encenderlo, cada cuánto (cada semana, cada 2 semanas o cada mes, el
 * mismo día del mes) y cuántas citas, de 2 a 24. El botón del formulario pasa a ser «Revisar fechas».
 */
export function SeriesFields({
  value,
  onChange,
  errors,
}: {
  value: SeriesRepeatValue;
  onChange: (value: SeriesRepeatValue) => void;
  errors: Record<string, string>;
}) {
  const switchId = useId();
  const hintId = `${switchId}-hint`;
  return (
    <div className="grid gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-start gap-3">
        <Switch
          id={switchId}
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
          aria-describedby={hintId}
          className="mt-0.5"
        />
        <div className="grid gap-0.5">
          <Label htmlFor={switchId} className="gap-1.5">
            <Repeat className="size-4 text-muted-foreground" aria-hidden /> Repetir
          </Label>
          <p id={hintId} className="text-xs text-muted-foreground">
            Agenda de una vez varias citas iguales. Antes de crearlas verás la lista de fechas.
          </p>
        </div>
      </div>
      {value.enabled && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Cada cuánto" error={errors["repeat.frequency"]}>
            {(field) => (
              <Select value={value.frequency} onValueChange={(frequency) => onChange({ ...value, frequency: frequency as AppointmentSeriesFrequency })}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {FREQUENCIES.map(([frequency, label]) => (
                    <SelectItem key={frequency} value={frequency}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField
            label="Cuántas citas"
            error={errors["repeat.count"]}
            hint={value.frequency === "monthly" ? "Contando la primera. Cada mes, el mismo día (o el último del mes)." : "Contando la primera."}
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                inputMode="numeric"
                min={SERIES_MIN}
                max={SERIES_MAX}
                step={1}
                value={value.count}
                onChange={(event) => onChange({ ...value, count: event.target.value })}
              />
            )}
          </FormField>
        </div>
      )}
    </div>
  );
}
