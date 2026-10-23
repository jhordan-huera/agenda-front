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

/**
 * El botón principal sobre la tarjeta de color: del color del texto del degradado, para que destaque (en el
 * claro, blanco con el principal; en el oscuro, claro con el degradado oscuro: 4,5:1 por la paleta).
 */
const LIGHT_BUTTON = "bg-hero-foreground text-hero hover:bg-hero-foreground/90";

/**
 * La tarjeta destacada: un degradado del color de la marca al tono de su resaltado (con los colores de cada
 * negocio). Con los tokens del degradado (spec 019): en el claro son el principal y el texto de las insignias
 * (--lilac-ink); en el oscuro, más oscuros.
 */
const FEATURED_CARD =
  "rounded-2xl bg-[linear-gradient(135deg,var(--hero),color-mix(in_oklch,var(--hero)_40%,var(--hero-end)))] text-hero-foreground shadow-[0_16px_32px_-18px_color-mix(in_oklch,var(--hero)_70%,transparent)]";

/**
 * Lo primero del Inicio: quién sigue y a qué hora, en la tarjeta destacada. La hora va grande; al
 * lado, lo necesario para atenderla (ver la cita o escribir al cliente por WhatsApp).
 */
export function NextUp({ appointment, clients, serviceName, business, now, onOpen, onCreate }: NextUpProps) {
  if (!appointment) {
    return (
      <section className={cn("flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7", FEATURED_CARD)}>
        <div>
          <h2 className="text-xl font-bold text-hero-foreground">No tienes citas próximas</h2>
          <p className="mt-1 text-hero-foreground/80">Agenda una cita o comparte tu página de reservas para que te reserven.</p>
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
        <h2 id="next-up-heading" className="text-sm font-semibold text-hero-foreground/85">
          {started ? "Ahora mismo" : "Tu siguiente cita"}
        </h2>
        <p className="mt-2 text-6xl leading-none font-extrabold tracking-[-0.03em] text-hero-foreground tabular-nums">{appointment.startTime}</p>
        <p className="mt-3 inline-flex rounded-full bg-hero-foreground/15 px-2.5 py-0.5 text-sm font-semibold text-hero-foreground">{when}</p>
      </div>

      <div className="min-w-0 sm:border-l sm:border-hero-foreground/20 sm:pl-8">
        <p className="text-2xl leading-tight font-bold tracking-[-0.01em] text-hero-foreground">
          {clients.length > 0 ? joinNames(clients.map((client) => client.name)) : "Cliente"}
        </p>
        <p className="mt-0.5 text-hero-foreground/80">
          {serviceName}, {formatDuration(minutes)}, hasta las {appointment.endTime}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* En el oscuro, su fondo translúcido no se leería sobre el degradado: va sobre el de las tarjetas. */}
          <StatusBadge status={appointment.status} className="dark:bg-card" />
          {/* Sobre la tarjeta de color, del color del texto como el resto. */}
          <ClientConfirmedBadge appointment={appointment} short className="bg-hero-foreground/15 text-sm font-semibold text-hero-foreground" />
          {appointment.homeVisit && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-hero-foreground">
              <Home className="size-4" aria-hidden /> A domicilio
            </span>
          )}
          {appointment.isVirtual && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-hero-foreground">
              <Video className="size-4" aria-hidden /> Virtual
            </span>
          )}
          {appointment.source === "booking_page" && <span className="text-sm text-hero-foreground/75">Reserva online</span>}
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
              // Las clases dark: pisan las del botón outline en el oscuro (dark:bg-input/30…).
              className="border-hero-foreground/25 bg-hero-foreground/10 text-hero-foreground hover:bg-hero-foreground/20 hover:text-hero-foreground dark:border-hero-foreground/25 dark:bg-hero-foreground/10 dark:hover:bg-hero-foreground/20"
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
