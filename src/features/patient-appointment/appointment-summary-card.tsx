import { CalendarDays, CheckCircle2, Clock, Home, MapPin, Navigation, Stethoscope, Video, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TimezoneNote } from "@/features/booking/timezone-note";
import { capitalize, formatLongDate, formatTimeRange } from "@/lib/format";
import { getDirectionsUrl, hasMapPoint } from "@/lib/maps";
import type { PublicAppointment } from "@/types";

/**
 * La cita en «Tu cita» (spec 010): el servicio, la fecha, la hora, con quién y dónde. Nada del paciente:
 * ni su nombre ni la dirección de una visita a domicilio ni el enlace de la videollamada (le llegan por
 * email). Si sigue activa, cómo la ve el negocio: confirmada o aún por confirmar.
 */
export function AppointmentSummaryCard({ appointment }: { appointment: PublicAppointment }) {
  const { business } = appointment;
  const active = (appointment.status === "pending" || appointment.status === "confirmed") && !appointment.past;
  const place = { address: business.address, lat: business.lat, lng: business.lng };

  return (
    <section aria-labelledby="appointment-service" className="rounded-2xl border bg-background p-5 sm:p-6">
      <h2 id="appointment-service" className="text-xl leading-tight font-bold">
        {appointment.serviceName}
      </h2>
      <dl className="mt-4 grid gap-3 text-sm">
        <Row icon={CalendarDays} label="Fecha">
          <span className="font-medium">{capitalize(formatLongDate(appointment.date))}</span>
        </Row>
        <Row icon={Clock} label="Hora">
          <span className="font-medium">{formatTimeRange(appointment.startTime, appointment.endTime)}</span>
          <TimezoneNote timezone={business.timezone} date={appointment.date} time={appointment.startTime} className="mt-1" />
        </Row>
        <Row icon={Stethoscope} label="Profesional">
          Con {appointment.professionalName}
        </Row>
        {appointment.place === "virtual" ? (
          <Row icon={Video} label="Lugar">
            Virtual (videollamada): el enlace te llega por email
          </Row>
        ) : appointment.place === "home" ? (
          <Row icon={Home} label="Lugar">
            A domicilio
          </Row>
        ) : (
          <Row icon={MapPin} label="Lugar">
            <span className="block">En el local{business.address ? `: ${business.address}` : ""}</span>
            {(business.address || hasMapPoint(place)) && (
              <Button asChild size="sm" variant="outline" className="mt-2">
                <a href={getDirectionsUrl(place)} target="_blank" rel="noreferrer">
                  <Navigation /> Cómo llegar
                </a>
              </Button>
            )}
          </Row>
        )}
      </dl>
      {active && (
        <p className="mt-4 flex items-start gap-2 border-t pt-4 text-sm text-muted-foreground">
          {appointment.status === "confirmed" ? (
            <>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
              <span>Confirmada por {business.name}.</span>
            </>
          ) : (
            <>
              <Clock className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
              <span>{business.name} aún debe confirmar la cita: te avisaremos por email.</span>
            </>
          )}
        </p>
      )}
    </section>
  );
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
