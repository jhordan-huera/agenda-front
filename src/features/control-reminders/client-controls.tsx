import { CalendarClock } from "lucide-react";
import { useControlReminders } from "@/hooks/queries/use-control-reminders";
import { getZonedNow } from "@/lib/time";
import type { Business } from "@/types";
import { describeClientControl } from "./control-reminder-text";

/**
 * Los controles de un paciente en su ficha (spec 051): «Próximo control: Limpieza dental, 12 de mayo» o «Control
 * vencido hace 2 semanas». Sólo si algún servicio tiene «Volver en»; quien tiene una cita por delante no tiene.
 */
export function ClientControls({ clientId, business, enabled }: { clientId: string; business: Business; enabled: boolean }) {
  const query = useControlReminders(enabled, clientId);
  const controls = query.data ?? [];
  if (!enabled || controls.length === 0) return null;
  const today = getZonedNow(business.timezone).date;
  return (
    <ul className="space-y-1.5 border-t pt-3 text-sm">
      {controls.map((control) => (
        <li key={control.appointmentId} className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>{describeClientControl(control, today)}</span>
        </li>
      ))}
    </ul>
  );
}
