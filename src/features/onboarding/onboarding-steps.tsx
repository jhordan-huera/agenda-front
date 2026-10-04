import type { ReactNode } from "react";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WeeklyScheduleEditor } from "@/features/schedule/weekly-schedule-editor";
import { getCategoryIcon } from "@/features/categories/category-icons";
import { useCategories } from "@/hooks/queries/use-categories";
import { Skeleton } from "@/components/ui/skeleton";
import { TIMEZONES, WEEK_DAYS } from "@/lib/constants/business";
import { formatCurrency, formatDuration } from "@/lib/format";
import { getZonedNow, minutesToTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { FieldErrors } from "@/lib/validations/validate";
import type { ScheduleDayInput } from "@/lib/validations/schedule";
import type { BusinessCategory } from "@/types";

export interface FirstServiceValues {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
  isActive: boolean;
}

export interface OnboardingValues {
  name: string;
  category: BusinessCategory | "";
  timezone: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  schedules: ScheduleDayInput[];
  service: FirstServiceValues;
}

interface StepProps {
  values: OnboardingValues;
  onChange: (patch: Partial<OnboardingValues>) => void;
  errors: FieldErrors;
}

export function BusinessNameStep({ values, onChange, errors }: StepProps) {
  return (
    <FormField label="Nombre del negocio" error={errors.name} hint="Así te verán tus clientes en tu página de reservas.">
      {(field) => (
        <Input
          {...field}
          autoFocus
          className="h-11 text-base"
          placeholder="Ej.: Consultorio Dra. Pérez"
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      )}
    </FormField>
  );
}

export function CategoryStep({ values, onChange, errors }: StepProps) {
  const { active: categories, isPending } = useCategories();
  return (
    <div>
      {isPending && <Skeleton className="h-40" />}
      <div role="radiogroup" aria-label="Tipo de negocio" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categories.map(({ id: value, name: label, icon }) => {
          const Icon = getCategoryIcon(icon);
          const selected = values.category === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ category: value })}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                selected && "border-primary bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              <Icon className={cn("size-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      {errors.category && <p className="mt-3 text-xs font-medium text-destructive">{errors.category}</p>}
    </div>
  );
}

export function BasicInfoStep({ values, onChange, errors }: StepProps) {
  const now = getZonedNow(values.timezone);
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Teléfono" error={errors.phone} optional>
          {(field) => (
            <Input
              {...field}
              type="tel"
              autoComplete="tel"
              placeholder="+593 99 123 4567"
              value={values.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Email del negocio" error={errors.email} optional hint="Si lo dejas vacío usaremos el de tu cuenta.">
          {(field) => (
            <Input {...field} type="email" value={values.email} onChange={(e) => onChange({ email: e.target.value })} />
          )}
        </FormField>
      </div>
      <FormField label="Dirección" error={errors.address} optional>
        {(field) => (
          <Input
            {...field}
            autoComplete="street-address"
            placeholder="Calle, número, ciudad"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Descripción" error={errors.description} optional hint="Aparece en tu página de reservas.">
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            placeholder="Cuenta a tus clientes qué ofreces…"
            value={values.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Zona horaria" hint={`Hora actual en esta zona: ${minutesToTime(now.minutes)}`}>
        {(field) => (
          <Select value={values.timezone} onValueChange={(timezone) => onChange({ timezone })}>
            <SelectTrigger {...field} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {TIMEZONES.map((timezone) => (
                <SelectItem key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </div>
  );
}

export function ScheduleStep({
  values,
  onChange,
  errors,
}: Omit<StepProps, "errors"> & { errors: Record<number, string> }) {
  return (
    <WeeklyScheduleEditor value={values.schedules} onChange={(schedules) => onChange({ schedules })} errors={errors} />
  );
}

export function FirstServiceStep({ values, onChange, errors }: StepProps) {
  const setService = (patch: Partial<FirstServiceValues>) => onChange({ service: { ...values.service, ...patch } });
  return (
    <div className="grid gap-5">
      <FormField label="Nombre del servicio" error={errors.name}>
        {(field) => <Input {...field} value={values.service.name} onChange={(e) => setService({ name: e.target.value })} />}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Duración (minutos)" error={errors.durationMinutes}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={5}
              step={5}
              value={values.service.durationMinutes}
              onChange={(e) => setService({ durationMinutes: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Precio (USD)" error={errors.price}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.service.price}
              onChange={(e) => setService({ price: e.target.value })}
            />
          )}
        </FormField>
      </div>
      <FormField label="Descripción" error={errors.description} optional>
        {(field) => (
          <Textarea
            {...field}
            rows={2}
            placeholder="Qué incluye el servicio…"
            value={values.service.description}
            onChange={(e) => setService({ description: e.target.value })}
          />
        )}
      </FormField>
      <p className="text-xs text-muted-foreground">Podrás crear más servicios desde el panel.</p>
    </div>
  );
}

export function SummaryStep({ values }: { values: OnboardingValues }) {
  const { label: categoryLabel } = useCategories();
  const timezoneLabel = TIMEZONES.find((t) => t.value === values.timezone)?.label ?? values.timezone;
  const activeDays = values.schedules.filter((day) => day.isActive);
  const duration = Number(values.service.durationMinutes);
  const price = Number(values.service.price);

  return (
    <dl className="divide-y rounded-xl border text-sm">
      <SummaryRow label="Negocio" value={values.name} />
      <SummaryRow label="Tipo" value={(values.category && categoryLabel(values.category)) || "—"} />
      <SummaryRow
        label="Contacto"
        value={[values.phone, values.email, values.address].filter(Boolean).join(" · ") || "Se completará con tu cuenta"}
      />
      <SummaryRow label="Zona horaria" value={timezoneLabel} />
      <SummaryRow
        label="Horario"
        value={
          <ul className="space-y-1">
            {activeDays.map((day) => (
              <li key={day.dayOfWeek}>
                <span className="font-medium">{WEEK_DAYS.find((d) => d.value === day.dayOfWeek)?.label}:</span>{" "}
                {day.intervals.map((i) => `${i.start}–${i.end}`).join(", ")}
              </li>
            ))}
          </ul>
        }
      />
      <SummaryRow
        label="Primer servicio"
        value={`${values.service.name} · ${formatDuration(duration)} · ${formatCurrency(price)}`}
      />
    </dl>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
