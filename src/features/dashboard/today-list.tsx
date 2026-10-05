import { ChevronRight, Home } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { timeToMinutes, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

interface TodayListProps {
  appointments: Appointment[];
  now: ZonedNow;
  /** La cita que ya se muestra arriba (Tu siguiente cita): no se repite aquí. */
  nextId: string | null;
  clientName: (id: string) => string;
  serviceName: (id: string) => string;
  onOpen: (appointment: Appointment) => void;
  onConfirm: (appointment: Appointment) => void;
  confirmingId: string | null;
}

/** Lo que queda de hoy, en filas cortas; lo ya atendido se pliega para no ocupar la vista. */
export function TodayList({ appointments, now, nextId, clientName, serviceName, onOpen, onConfirm, confirmingId }: TodayListProps) {
  const done = appointments.filter((a) => timeToMinutes(a.endTime) <= now.minutes);
  const later = appointments.filter((a) => timeToMinutes(a.endTime) > now.minutes && a.id !== nextId);

  const row = (appointment: Appointment, muted = false) => (
    <li key={appointment.id} className={cn("flex items-center gap-3 py-3", muted && "opacity-70")}>
      <button
        type="button"
        onClick={() => onOpen(appointment)}
        className="-mx-2 flex min-w-0 flex-1 items-center gap-4 rounded-md px-2 py-1 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="w-14 shrink-0 text-lg font-bold text-ink tabular-nums">{appointment.startTime}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{clientName(appointment.clientId)}</span>
          <span className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            {appointment.homeVisit && <Home className="size-3.5 shrink-0 text-ink" aria-label="A domicilio" />}
            {serviceName(appointment.serviceId)}, hasta las {appointment.endTime}
          </span>
        </span>
        <StatusBadge status={appointment.status} className="hidden sm:inline-flex" />
      </button>
      {appointment.status === "pending" && !muted && (
        <Button size="sm" variant="outline" disabled={confirmingId === appointment.id} onClick={() => onConfirm(appointment)}>
          Confirmar
        </Button>
      )}
    </li>
  );

  return (
    <section aria-labelledby="today-heading">
      <h2 id="today-heading" className="border-b-2 border-ink pb-2 font-bold">
        Lo que queda de hoy
      </h2>
      {later.length === 0 ? (
        <p className="py-4 text-muted-foreground">
          {nextId ? "Después de tu siguiente cita no tienes más por hoy." : "No te quedan citas por hoy."}
        </p>
      ) : (
        <ul className="divide-y">{later.map((appointment) => row(appointment))}</ul>
      )}
      {done.length > 0 && (
        <details className="group border-t">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 transition-transform duration-150 group-open:rotate-90" aria-hidden />
            Ya atendidas hoy: {plural(done.length, "cita", "citas")}
          </summary>
          <ul className="divide-y">{done.map((appointment) => row(appointment, true))}</ul>
        </details>
      )}
    </section>
  );
}
