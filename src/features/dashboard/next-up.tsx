import { CalendarPlus, Home } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { capitalize, formatDuration, formatLongDate } from "@/lib/format";
import { timeToMinutes, type ZonedNow } from "@/lib/time";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { Appointment, Business, Client } from "@/types";
import { untilLabel } from "./day-plan";

interface NextUpProps {
  appointment: Appointment | null;
  client: Client | undefined;
  serviceName: string;
  business: Business | undefined;
  now: ZonedNow;
  onOpen: (appointment: Appointment) => void;
  onCreate: () => void;
}

/**
 * Lo primero del Inicio: quién sigue y a qué hora. La hora va grande y marcada en lila;
 * al lado, lo necesario para atenderla (ver la cita o escribir al cliente por WhatsApp).
 */
export function NextUp({ appointment, client, serviceName, business, now, onOpen, onCreate }: NextUpProps) {
  if (!appointment) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl bg-accent p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <h2 className="text-xl font-bold">No tienes citas próximas</h2>
          <p className="mt-1 text-muted-foreground">Agenda una cita o comparte tu página de reservas para que te reserven.</p>
        </div>
        <Button size="lg" onClick={onCreate}>
          <CalendarPlus /> Nueva cita
        </Button>
      </section>
    );
  }

  const today = appointment.date === now.date;
  const started = today && timeToMinutes(appointment.startTime) <= now.minutes;
  const when = untilLabel(appointment, now) || capitalize(formatLongDate(appointment.date));
  const minutes = timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime);
  const whatsAppUrl =
    client?.phone && business
      ? getWhatsAppUrl(
          client.phone,
          business.timezone,
          `Hola ${client.name.split(" ")[0]}, te escribimos de ${business.name} sobre tu cita de ${serviceName} ${today ? "de hoy" : `del ${formatLongDate(appointment.date)}`} a las ${appointment.startTime}.`,
        )
      : null;

  return (
    <section
      aria-labelledby="next-up-heading"
      className="grid gap-6 rounded-2xl bg-accent p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-7"
    >
      <div>
        <h2 id="next-up-heading" className="text-sm font-semibold text-ink">
          {started ? "Ahora mismo" : "Tu siguiente cita"}
        </h2>
        <p className="mt-2 text-6xl leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
          <span className="marker">{appointment.startTime}</span>
        </p>
        <p className="mt-3 font-semibold">{when}</p>
      </div>

      <div className="min-w-0 sm:border-l sm:border-ink/15 sm:pl-8">
        <p className="text-2xl leading-tight font-bold tracking-[-0.01em]">{client?.name ?? "Cliente"}</p>
        <p className="mt-0.5 text-muted-foreground">
          {serviceName}, {formatDuration(minutes)}, hasta las {appointment.endTime}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} />
          {appointment.homeVisit && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
              <Home className="size-4" aria-hidden /> A domicilio
            </span>
          )}
          {appointment.source === "booking_page" && <span className="text-sm text-muted-foreground">Reserva online</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
        <Button size="lg" onClick={() => onOpen(appointment)}>
          Ver cita
        </Button>
        {whatsAppUrl && (
          <Button asChild size="lg" variant="outline" className="bg-background">
            <a href={whatsAppUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon /> WhatsApp
            </a>
          </Button>
        )}
        </div>
      </div>
    </section>
  );
}
