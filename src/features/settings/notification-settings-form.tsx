import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBusinessId } from "@/features/auth/use-session";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { queryKeys } from "@/hooks/queries/query-keys";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import type { Business, NotificationSettings } from "@/types";
import { SettingsSection } from "./settings-section";
import { SwitchField } from "./switch-field";
import { useSettingsForm } from "./use-settings-form";

const REMINDER_OPTIONS = [2, 12, 24, 48];

/** Con los valores por defecto: los negocios de antes no traen los ajustes nuevos. */
const settingsOf = (business: Business): NotificationSettings => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
  ...business.notificationSettings,
});

/** Guardados de las dos secciones en fila: cada uno parte de lo que dejó el anterior. */
let saveQueue: Promise<unknown> = Promise.resolve();

/**
 * Guarda los campos de una sección. La API sustituye todos los ajustes de avisos de una vez: se
 * envían los recién leídos con los de esta sección encima, para no deshacer lo que guardó la otra
 * (guardar "Emails a tus clientes" deshacía "Avisos por WhatsApp").
 */
function useSaveNotificationSettings(business: Business) {
  const businessId = useBusinessId();
  const queryClient = useQueryClient();
  const updateBusiness = useUpdateBusiness();
  const [saving, setSaving] = useState(false);

  const save = async (fields: Partial<NotificationSettings>) => {
    setSaving(true);
    const run = saveQueue.then(() => {
      const latest = queryClient.getQueryData<Business>(queryKeys.business(businessId)) ?? business;
      return updateBusiness.mutateAsync({ notificationSettings: { ...settingsOf(latest), ...fields } });
    });
    saveQueue = run.catch(() => undefined);
    try {
      await run;
    } finally {
      setSaving(false);
    }
  };
  return { save, saving };
}

export function NotificationSettingsForm({ business }: { business: Business }) {
  const current = settingsOf(business);
  // Sólo los campos de esta sección: los de WhatsApp los guarda la suya.
  const { values, setField, dirty, reset } = useSettingsForm({
    confirmations: current.confirmations,
    reminders: current.reminders,
    cancellations: current.cancellations,
    reminderHoursBefore: current.reminderHoursBefore,
  });
  const { save, saving } = useSaveNotificationSettings(business);

  const submit = async () => {
    try {
      await save(values);
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
      saving={saving}
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

/**
 * Avisos por WhatsApp al cambiar una cita: se abre WhatsApp con el mensaje ya escrito y el
 * profesional lo envía (enlace wa.me, sin coste). Comparten el guardado con los emails.
 */
export function WhatsAppNoticeSettingsForm({ business }: { business: Business }) {
  const current = settingsOf(business);
  const { values, setField, dirty, reset } = useSettingsForm({
    whatsappOnStatusChange: current.whatsappOnStatusChange,
    whatsappFollowUps: current.whatsappFollowUps,
  });
  const { save, saving } = useSaveNotificationSettings(business);

  const submit = async () => {
    try {
      await save(values);
      reset(values);
      toast.success("Preferencias de WhatsApp guardadas");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Avisos por WhatsApp"
      description="Al cambiar una cita, se abre WhatsApp con el mensaje para tu cliente ya escrito: tú sólo lo revisas y tocas Enviar. Sin costo."
      dirty={dirty}
      saving={saving}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Al confirmar, cancelar o cambiar una cita"
        description="Avisa de la confirmación, la cancelación o la nueva fecha y hora (además del email)."
        checked={values.whatsappOnStatusChange}
        onCheckedChange={(checked) => setField("whatsappOnStatusChange", checked)}
      />
      <SwitchField
        label="Al marcar Completada o No asistió"
        description="Un gracias por la visita, o una invitación a reagendar con tu enlace de reservas."
        checked={values.whatsappFollowUps}
        onCheckedChange={(checked) => setField("whatsappFollowUps", checked)}
      />
    </SettingsSection>
  );
}
