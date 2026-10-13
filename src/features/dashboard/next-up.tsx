import { CalendarPlus, Home, Video } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { capitalize, formatDuration, formatLongDate } from "@/lib/format";
import { timeToMinutes, type ZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
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

/** El botón principal sobre la tarjeta oscura: claro, para que destaque. */
const LIGHT_BUTTON = "bg-white text-shell hover:bg-white/90";

/** Fondo de la tarjeta: el oscuro del menú con un resplandor del color de la marca arriba a la derecha. */
const DARK_CARD =
  "rounded-2xl bg-shell bg-[radial-gradient(120%_140%_at_100%_0%,color-mix(in_oklch,var(--ink)_45%,transparent),transparent_62%)] text-shell-foreground shadow-[0_8px_24px_-12px_rgb(16_24_40/0.45)]";

/**
 * Lo primero del Inicio: quién sigue y a qué hora, en la tarjeta oscura destacada. La hora va
 * grande; al lado, lo necesario para atenderla (ver la cita o escribir al cliente por WhatsApp).
 */
export function NextUp({ appointment, client, serviceName, business, now, onOpen, onCreate }: NextUpProps) {
  if (!appointment) {
    return (
      <section className={cn("flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7", DARK_CARD)}>
        <div>
          <h2 className="text-xl font-bold text-white">No tienes citas próximas</h2>
          <p className="mt-1 text-shell-foreground/70">Agenda una cita o comparte tu página de reservas para que te reserven.</p>
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
      className={cn("grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-7", DARK_CARD)}
    >
      <div>
        <h2 id="next-up-heading" className="text-sm font-semibold text-highlight">
          {started ? "Ahora mismo" : "Tu siguiente cita"}
        </h2>
        <p className="mt-2 text-6xl leading-none font-extrabold tracking-[-0.03em] text-white tabular-nums">{appointment.startTime}</p>
        <p className="mt-3 inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-sm font-semibold text-white">{when}</p>
      </div>

      <div className="min-w-0 sm:border-l sm:border-white/12 sm:pl-8">
        <p className="text-2xl leading-tight font-bold tracking-[-0.01em] text-white">{client?.name ?? "Cliente"}</p>
        <p className="mt-0.5 text-shell-foreground/70">
          {serviceName}, {formatDuration(minutes)}, hasta las {appointment.endTime}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} />
          {appointment.homeVisit && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-highlight">
              <Home className="size-4" aria-hidden /> A domicilio
            </span>
          )}
          {appointment.isVirtual && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-highlight">
              <Video className="size-4" aria-hidden /> Virtual
            </span>
          )}
          {appointment.source === "booking_page" && <span className="text-sm text-shell-foreground/60">Reserva online</span>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="lg" className={LIGHT_BUTTON} onClick={() => onOpen(appointment)}>
            Ver cita
          </Button>
          {whatsAppUrl && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
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
