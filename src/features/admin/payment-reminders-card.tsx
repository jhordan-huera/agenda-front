import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsSection } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { useSetPaymentReminders } from "@/hooks/queries/use-admin";
import {
  PAYMENT_REMINDER_DAYS_OPTIONS,
  PAYMENT_REMINDER_HOUR,
  PAYMENT_REMINDERS_PER_APPOINTMENT,
  paymentRemindersOf,
} from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import type { Business, PaymentReminderDays } from "@/types";

/**
 * «Pedir el comprobante de pago» de un negocio (spec 039), sólo del super admin: el interruptor y qué días
 * salen los recordatorios, siempre antes de la cita, con un ejemplo de fechas. Los días se cambian con el
 * interruptor encendido. Queda en la actividad del negocio y de la plataforma.
 */
export function PaymentRemindersCard({ business }: { business: Business }) {
  const saved = paymentRemindersOf(business);
  const [enabled, setEnabled] = useState(saved.enabled);
  const [days, setDays] = useState<PaymentReminderDays>(saved.days);
  const save = useSetPaymentReminders();
  const turningOn = enabled && !saved.enabled;
  // Los días sólo cuentan con el interruptor encendido.
  const dirty = enabled !== saved.enabled || (enabled && days !== saved.days);
  const example = PAYMENT_REMINDER_DAYS_OPTIONS.find((option) => option.value === days)?.example;

  const reset = (next = saved) => {
    setEnabled(next.enabled);
    setDays(next.days);
  };

  const submit = async () => {
    try {
      const updated = await save.mutateAsync({ businessId: business.id, input: enabled ? { enabled, days } : { enabled } });
      const next = paymentRemindersOf(updated);
      reset(next);
      toast.success(
        turningOn ? "Comprobante de pago activado" : next.enabled ? "Días de los recordatorios guardados" : "Comprobante de pago desactivado",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Pedir el comprobante de pago"
      description="Recordatorios por email para que los pacientes envíen el comprobante de su transferencia antes de la cita. El negocio no puede cambiarlo desde su configuración."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Recordar al paciente que envíe el comprobante"
        description={`Antes de su cita, desde las ${PAYMENT_REMINDER_HOUR}:00 de la hora del negocio, el paciente recibe un email al día con el enlace para subir el comprobante, hasta ${PAYMENT_REMINDERS_PER_APPOINTMENT} por cita. Sólo las citas con precio, pendientes o confirmadas, de las agendas con cuentas para transferir; nunca después de que empiece la cita. Si lo apagas, no sale ninguno más y el enlace de pago sigue como siempre.`}
        checked={enabled}
        onCheckedChange={setEnabled}
      >
        {enabled && (
          <FormField label="Qué días salen" hint={example}>
            {(field) => (
              <Select value={days} onValueChange={(value) => setDays(value as PaymentReminderDays)}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {PAYMENT_REMINDER_DAYS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="whitespace-normal">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        )}
      </SwitchField>
    </SettingsSection>
  );
}
