import { Button } from "@/components/ui/button";
import { capitalize, formatShortDate } from "@/lib/format";
import type { ZonedNow } from "@/lib/time";
import type { Appointment } from "@/types";

interface PendingBookingsProps {
  appointments: Appointment[];
  now: ZonedNow;
  clientName: (id: string) => string;
  serviceName: (id: string) => string;
  onOpen: (appointment: Appointment) => void;
  onConfirm: (appointment: Appointment) => void;
  /** Las que se están confirmando. */
  confirmingIds: ReadonlySet<string>;
}

/** Citas por confirmar (sobre todo las que llegan de la página de reservas): se confirman aquí mismo. */
export function PendingBookings({
  appointments,
  now,
  clientName,
  serviceName,
  onOpen,
  onConfirm,
  confirmingIds,
}: PendingBookingsProps) {
  return (
    <section aria-labelledby="pending-heading">
      <h2 id="pending-heading" className="flex items-baseline justify-between gap-2 border-b-2 border-ink pb-2 font-bold">
        Por confirmar
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">{appointments.length}</span>
      </h2>
      {appointments.length === 0 ? (
        <p className="py-4 text-muted-foreground">No tienes citas por confirmar.</p>
      ) : (
        <ul className="divide-y">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => onOpen(appointment)}
                className="-mx-1 min-w-0 flex-1 rounded-md px-1 py-0.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="block text-sm font-bold text-ink tabular-nums">
                  {appointment.date === now.date ? "Hoy" : capitalize(formatShortDate(appointment.date))}, {appointment.startTime}
                </span>
                <span className="block truncate font-semibold">{clientName(appointment.clientId)}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {serviceName(appointment.serviceId)}
                  {appointment.source === "booking_page" && ", reserva online"}
                </span>
              </button>
              <Button size="sm" variant="outline" disabled={confirmingIds.has(appointment.id)} onClick={() => onConfirm(appointment)}>
                Confirmar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
