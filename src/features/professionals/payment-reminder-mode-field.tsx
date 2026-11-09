import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_REMINDER_HOUR, PAYMENT_REMINDER_MODE_OPTIONS, PAYMENT_REMINDERS_PER_APPOINTMENT } from "@/lib/constants/business";
import type { PaymentReminderMode } from "@/types";

interface PaymentReminderModeFieldProps {
  value: PaymentReminderMode;
  onChange: (mode: PaymentReminderMode) => void;
  /** "own": la agenda de quien la mira («Tu agenda»); "other": la de otro profesional (Profesionales). */
  person: "own" | "other";
  /** Guardando el cambio. */
  disabled?: boolean;
}

/**
 * El modo de los recordatorios del comprobante de pago de una agenda (spec 039), sólo en los negocios con
 * «Pedir el comprobante de pago»: «Antes de la cita» o «Después de la cita», con la explicación del elegido.
 * Junto a las invitaciones de calendario, con el mismo marco que sus interruptores.
 */
export function PaymentReminderModeField({ value, onChange, person, disabled }: PaymentReminderModeFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const own = person === "own";
  const chosen = PAYMENT_REMINDER_MODE_OPTIONS.find((option) => option.value === value);
  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <Label htmlFor={id}>{own ? "Recordar a tus pacientes el comprobante de pago" : "Recordar a sus pacientes el comprobante de pago"}</Label>
      <Select value={value} onValueChange={(mode) => onChange(mode as PaymentReminderMode)} disabled={disabled}>
        <SelectTrigger id={id} aria-describedby={descriptionId} className="w-full sm:w-64">
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
      <p id={descriptionId} className="text-xs text-muted-foreground">
        {chosen?.description} Salen por email a las {PAYMENT_REMINDER_HOUR}:00, uno al día y hasta {PAYMENT_REMINDERS_PER_APPOINTMENT} por
        cita, con el enlace para subir el comprobante. El cambio vale desde el próximo envío.
      </p>
    </div>
  );
}
