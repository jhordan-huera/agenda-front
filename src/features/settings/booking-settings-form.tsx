import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { DEFAULT_MAX_CLIENT_BOOKINGS_PER_DAY, SLOT_INTERVAL_OPTIONS } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { formatDuration } from "@/lib/format";
import { bookingSettingsSchema } from "@/lib/validations/business";
import { validate } from "@/lib/validations/validate";
import type { BookingSettings, Business } from "@/types";
import { SettingsSection } from "./settings-section";
import { SwitchField } from "./switch-field";
import { useSettingsForm } from "./use-settings-form";

const toFormValues = (settings: BookingSettings) => ({
  alignSlotsToDuration: settings.alignSlotsToDuration,
  slotIntervalMinutes: String(settings.slotIntervalMinutes),
  minNoticeHours: String(settings.minNoticeHours),
  maxAdvanceDays: String(settings.maxAdvanceDays),
  allowCancellations: settings.allowCancellations,
  cancellationNoticeHours: String(settings.cancellationNoticeHours),
  cancellationPolicy: settings.cancellationPolicy,
  maxClientBookingsPerDay: String(settings.maxClientBookingsPerDay ?? DEFAULT_MAX_CLIENT_BOOKINGS_PER_DAY),
});

/** Citas por día por persona desde la página pública ("0" = sin límite). */
const CLIENT_DAILY_OPTIONS = [
  { value: "1", label: "1 cita por día (recomendado)" },
  { value: "2", label: "Hasta 2 citas por día" },
  { value: "3", label: "Hasta 3 citas por día" },
  { value: "0", label: "Sin límite" },
];

export function BookingSettingsForm({ business }: { business: Business }) {
  const updateBusiness = useUpdateBusiness();
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(toFormValues(business.bookingSettings));

  const submit = async () => {
    const result = validate(bookingSettingsSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await updateBusiness.mutateAsync({ bookingSettings: result.data });
      reset(toFormValues(result.data));
      toast.success("Configuración de agenda guardada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Agenda"
      description="Reglas de reserva y de cancelación que se aplican a tu página pública."
      dirty={dirty}
      saving={updateBusiness.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Horas según la duración del servicio"
        description={
          values.alignSlotsToDuration
            ? "Un servicio de 1 h se ofrece a las 08:00, 09:00, 10:00… y uno de 30 min, cada media hora. Las citas quedan seguidas, sin huecos."
            : "Las horas de inicio se ofrecen cada cierto tiempo, sea cual sea la duración del servicio."
        }
        checked={values.alignSlotsToDuration}
        onCheckedChange={(checked) => setField("alignSlotsToDuration", checked)}
      >
        {!values.alignSlotsToDuration && (
          <FormField
            label="Ofrecer horas cada"
            error={errors.slotIntervalMinutes}
            hint="Ejemplo con 30 min: 09:00, 09:30, 10:00… (un servicio de 1 h podría empezar a las 09:30)."
          >
            {(field) => (
              <Select value={values.slotIntervalMinutes} onValueChange={(value) => setField("slotIntervalMinutes", value)}>
                <SelectTrigger {...field} className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {SLOT_INTERVAL_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {formatDuration(minutes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      </SwitchField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Anticipación mínima (horas)"
          error={errors.minNoticeHours}
          hint="Cuántas horas antes, como mínimo, pueden reservar tus clientes (0: hasta justo antes de la cita). Desde tu panel puedes agendar a cualquier hora."
        >
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={0}
              max={720}
              value={values.minNoticeHours}
              onChange={(e) => setField("minNoticeHours", e.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Anticipación máxima (días)"
          error={errors.maxAdvanceDays}
          hint="Hasta cuántos días en el futuro pueden reservar tus clientes."
        >
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={1}
              value={values.maxAdvanceDays}
              onChange={(e) => setField("maxAdvanceDays", e.target.value)}
            />
          )}
        </FormField>
      </div>
      <FormField
        label="Citas por persona desde tu página"
        error={errors.maxClientBookingsPerDay}
        hint="Cuántas citas puede reservar una misma persona (por su cédula) el mismo día. Evita reservas repetidas por error; desde tu panel puedes agendarle las que quieras."
      >
        {(field) => (
          <Select value={values.maxClientBookingsPerDay} onValueChange={(value) => setField("maxClientBookingsPerDay", value)}>
            <SelectTrigger {...field} className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {CLIENT_DAILY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <SwitchField
        label="Permitir cancelaciones"
        description="Muestra tu política al reservar y en los emails de confirmación."
        checked={values.allowCancellations}
        onCheckedChange={(checked) => setField("allowCancellations", checked)}
      >
        {values.allowCancellations && (
          <div className="grid gap-4">
            <FormField
              label="Antelación mínima para cancelar (horas)"
              error={errors.cancellationNoticeHours}
              hint="Pasado este plazo, la cancelación debe gestionarse contigo directamente."
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="sm:w-40"
                  value={values.cancellationNoticeHours}
                  onChange={(e) => setField("cancellationNoticeHours", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Política de cancelación" error={errors.cancellationPolicy} hint="El cliente la ve antes de confirmar su reserva.">
              {(field) => (
                <Textarea
                  {...field}
                  rows={3}
                  value={values.cancellationPolicy}
                  onChange={(e) => setField("cancellationPolicy", e.target.value)}
                />
              )}
            </FormField>
          </div>
        )}
      </SwitchField>
    </SettingsSection>
  );
}
