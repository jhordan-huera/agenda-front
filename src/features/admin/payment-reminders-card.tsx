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
  PAYMENT_REMINDER_MODE_OPTIONS,
  PAYMENT_REMINDERS_PER_APPOINTMENT,
  paymentRemindersOf,
} from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import type { Business, PaymentReminderDays, PaymentReminderMode } from "@/types";

/**
 * «Pedir el comprobante de pago» de un negocio (spec 039), sólo del super admin: el interruptor, el modo que
 * toman todas sus agendas al activarlo y los días del modo «Antes de la cita», con un ejemplo de fechas. Con
 * el interruptor encendido sólo se cambian los días: el modo lo elige después cada agenda. Queda en la
 * actividad del negocio y de la plataforma.
 */
export function PaymentRemindersCard({ business }: { business: Business }) {
  const saved = paymentRemindersOf(business);
  const [enabled, setEnabled] = useState(saved.enabled);
  const [defaultMode, setDefaultMode] = useState<PaymentReminderMode>("before");
  const [days, setDays] = useState<PaymentReminderDays>(saved.days);
  const save = useSetPaymentReminders();
  const turningOn = enabled && !saved.enabled;
  // El modo por defecto sólo cuenta al activarlo; los días, con el interruptor encendido.
  const dirty = enabled !== saved.enabled || (enabled && days !== saved.days);
  const example = PAYMENT_REMINDER_DAYS_OPTIONS.find((option) => option.value === days)?.example;
  const modeHint = PAYMENT_REMINDER_MODE_OPTIONS.find((option) => option.value === defaultMode)?.description;

  const reset = (next = saved) => {
    setEnabled(next.enabled);
    setDays(next.days);
    setDefaultMode("before");
  };

  const submit = async () => {
    try {
      const updated = await save.mutateAsync({
        businessId: business.id,
        input: enabled ? { enabled, days, ...(turningOn && { defaultMode }) } : { enabled },
      });
      const next = paymentRemindersOf(updated);
      reset(next);
      toast.success(
        turningOn
          ? "Comprobante de pago activado"
          : next.enabled
            ? "Días de los recordatorios guardados"
            : "Comprobante de pago desactivado",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Pedir el comprobante de pago"
      description="Recordatorios por email para que los pacientes envíen el comprobante de su transferencia. El negocio no puede cambiarlo desde su configuración."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Recordar al paciente que envíe el comprobante"
        description={`Cada día, desde las ${PAYMENT_REMINDER_HOUR}:00 de la hora del negocio, el paciente recibe un email con el enlace para subir el comprobante, hasta ${PAYMENT_REMINDERS_PER_APPOINTMENT} por cita. Sólo las citas con precio de las agendas con cuentas para transferir. Si lo apagas, no sale ninguno más y el enlace de pago sigue como siempre.`}
        checked={enabled}
        onCheckedChange={setEnabled}
      >
        {enabled && (
          <div className="grid gap-4">
            {turningOn ? (
              <FormField label="Modo de todas las agendas" hint={`${modeHint} Después, cada profesional lo cambia en su agenda.`}>
                {(field) => (
                  <Select value={defaultMode} onValueChange={(value) => setDefaultMode(value as PaymentReminderMode)}>
                    <SelectTrigger {...field} className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {PAYMENT_REMINDER_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cada agenda tiene su modo, «Antes de la cita» o «Después de la cita», y lo cambia el profesional en su agenda.
              </p>
            )}
            <FormField label="Días del modo «Antes de la cita»" hint={example}>
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
            <p className="text-xs text-muted-foreground">
              En el modo «Después de la cita», salen desde el día siguiente a la cita (Completada o Confirmada sin cerrar), uno por día.
            </p>
          </div>
        )}
      </SwitchField>
    </SettingsSection>
  );
}
