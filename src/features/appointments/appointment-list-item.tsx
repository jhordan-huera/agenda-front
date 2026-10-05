import { StatusBadge } from "@/components/shared/status-badge";
import { capitalize, formatShortDate } from "@/lib/format";
import type { Appointment } from "@/types";

interface AppointmentListItemProps {
  appointment: Appointment;
  title: string;
  subtitle: string;
  showDate?: boolean;
  onClick: (appointment: Appointment) => void;
}

/** Fila compacta de cita (hora, título y estado) para listas. */
export function AppointmentListItem({ appointment, title, subtitle, showDate, onClick }: AppointmentListItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(appointment)}
        className="flex w-full items-center gap-4 rounded-lg px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="w-16 shrink-0">
          <p className="text-lg leading-tight font-bold text-ink tabular-nums">{appointment.startTime}</p>
          {showDate && (
            <p className="text-xs text-muted-foreground">{capitalize(formatShortDate(appointment.date))}</p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <StatusBadge status={appointment.status} />
      </button>
    </li>
  );
}
