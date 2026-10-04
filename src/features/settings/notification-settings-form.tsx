import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { getErrorMessage } from "@/lib/data";
import type { Business } from "@/types";
import { SettingsSection } from "./settings-section";
import { SwitchField } from "./switch-field";
import { useSettingsForm } from "./use-settings-form";

const REMINDER_OPTIONS = [2, 12, 24, 48];

export function NotificationSettingsForm({ business }: { business: Business }) {
  const updateBusiness = useUpdateBusiness();
  const { values, setField, dirty, reset } = useSettingsForm(business.notificationSettings);

  const submit = async () => {
    try {
      await updateBusiness.mutateAsync({ notificationSettings: values });
      reset(values);
      toast.success("Preferencias de notificación guardadas");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Emails a tus clientes"
      description="Elige qué emails automáticos reciben tus clientes. Los emails de cuenta (registro, contraseña) se envían siempre."
      dirty={dirty}
      saving={updateBusiness.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Confirmaciones"
        description="Al reservar, confirmar o modificar una cita."
        checked={values.confirmations}
        onCheckedChange={(checked) => setField("confirmations", checked)}
      />
      <SwitchField
        label="Recordatorios"
        description="Un recordatorio antes de cada cita pendiente o confirmada."
        checked={values.reminders}
        onCheckedChange={(checked) => setField("reminders", checked)}
      >
        {values.reminders && (
          <label className="flex flex-wrap items-center gap-3 text-sm">
            Enviar
            <Select
              value={String(values.reminderHoursBefore)}
              onValueChange={(hours) => setField("reminderHoursBefore", Number(hours))}
            >
              <SelectTrigger aria-label="Antelación del recordatorio" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {REMINDER_OPTIONS.map((hours) => (
                  <SelectItem key={hours} value={String(hours)}>
                    {hours} horas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            antes de la cita
          </label>
        )}
      </SwitchField>
      <SwitchField
        label="Cancelaciones"
        description="Cuando una cita se cancela."
        checked={values.cancellations}
        onCheckedChange={(checked) => setField("cancellations", checked)}
      />
    </SettingsSection>
  );
}
