import { CalendarPlus, Home, Video } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { ClientConfirmedBadge } from "@/features/appointments/client-confirmed-badge";
import { Button } from "@/components/ui/button";
import { capitalize, formatDuration, formatLongDate, joinNames } from "@/lib/format";
import { timeToMinutes, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { Appointment, Business, Client } from "@/types";
import { untilLabel } from "./day-plan";

interface NextUpProps {
  appointment: Appointment | null;
  /** Los pacientes de la cita (con varios pacientes, todos; el principal primero). */
  clients: Client[];
  serviceName: string;
  business: Business | undefined;
  now: ZonedNow;
  onOpen: (appointment: Appointment) => void;
  onCreate: () => void;
}

/** El botón principal sobre la tarjeta de color: blanco, para que destaque. */
const LIGHT_BUTTON = "bg-white text-ink hover:bg-white/90";

/** La tarjeta destacada: un degradado del color de la marca a su lila (con los colores de cada negocio). */
const FEATURED_CARD =
  "rounded-2xl bg-[linear-gradient(135deg,var(--ink),color-mix(in_oklch,var(--ink)_40%,var(--lilac-ink)))] text-white shadow-[0_16px_32px_-18px_color-mix(in_oklch,var(--ink)_70%,transparent)]";

/**
 * Lo primero del Inicio: quién sigue y a qué hora, en la tarjeta destacada. La hora va grande; al
 * lado, lo necesario para atenderla (ver la cita o escribir al cliente por WhatsApp).
 */
export function NextUp({ appointment, clients, serviceName, business, now, onOpen, onCreate }: NextUpProps) {
  if (!appointment) {
    return (
      <section className={cn("flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7", FEATURED_CARD)}>
        <div>
          <h2 className="text-xl font-bold text-white">No tienes citas próximas</h2>
          <p className="mt-1 text-white/80">Agenda una cita o comparte tu página de reservas para que te reserven.</p>
        </div>
        <Button size="lg" className={LIGHT_BUTTON} onClick={onCreate}>
          <CalendarPlus /> Nueva cita
        </Button>
      </section>
    );
  }

  const today = appointment.date === now.date;
  const started = today && timeToMinutes(appointment.startTime) <= now.minutes;
  const when = untilLabel(appointment, now) || capitalize(formatLongDate(appointment.date));
  const minutes = timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime);
  // Un botón de WhatsApp por paciente con teléfono (en una sesión de pareja, uno para cada uno).
  const whatsApp = business
    ? clients.flatMap((client) => {
        const url = client.phone
          ? getWhatsAppUrl(
              client.phone,
              business.timezone,
              `Hola ${client.name.split(" ")[0]}, te escribimos de ${business.name} sobre tu cita de ${serviceName} ${today ? "de hoy" : `del ${formatLongDate(appointment.date)}`} a las ${appointment.startTime}.`,
            )
          : null;
        return url ? [{ client, url }] : [];
      })
    : [];

  return (
    <section
      aria-labelledby="next-up-heading"
      className={cn("grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-7", FEATURED_CARD)}
    >
      <div>
        <h2 id="next-up-heading" className="text-sm font-semibold text-white/85">
          {started ? "Ahora mismo" : "Tu siguiente cita"}
        </h2>
        <p className="mt-2 text-6xl leading-none font-extrabold tracking-[-0.03em] text-white tabular-nums">{appointment.startTime}</p>
        <p className="mt-3 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-semibold text-white">{when}</p>
      </div>

      <div className="min-w-0 sm:border-l sm:border-white/20 sm:pl-8">
        <p className="text-2xl leading-tight font-bold tracking-[-0.01em] text-white">
          {clients.length > 0 ? joinNames(clients.map((client) => client.name)) : "Cliente"}
        </p>
        <p className="mt-0.5 text-white/80">
          {serviceName}, {formatDuration(minutes)}, hasta las {appointment.endTime}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} />
          {/* Sobre la tarjeta de color, en blanco como el resto. */}
          <ClientConfirmedBadge appointment={appointment} short className="bg-white/15 text-sm font-semibold text-white" />
          {appointment.homeVisit && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
              <Home className="size-4" aria-hidden /> A domicilio
            </span>
          )}
          {appointment.isVirtual && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
              <Video className="size-4" aria-hidden /> Virtual
            </span>
          )}
          {appointment.source === "booking_page" && <span className="text-sm text-white/75">Reserva online</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="lg" className={LIGHT_BUTTON} onClick={() => onOpen(appointment)}>
            Ver cita
          </Button>
          {whatsApp.map(({ client, url }) => (
            <Button
              key={client.id}
              asChild
              size="lg"
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <a href={url} target="_blank" rel="noreferrer" aria-label={`Escribir a ${client.name} por WhatsApp`}>
                <WhatsAppIcon /> {whatsApp.length > 1 ? client.name.split(" ")[0] : "WhatsApp"}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
