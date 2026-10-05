import { Home } from "lucide-react";
import { getListPrice } from "@/features/appointments/appointment-utils";
import { capitalize, formatCurrency, formatDuration, formatLongDate, formatTimeRange, isPriceVisible } from "@/lib/format";
import { addMinutesToTime } from "@/lib/time";
import type { ISODate, PublicBusiness, PublicProfessional, PublicService } from "@/types";

interface BookingSummaryProps {
  business: PublicBusiness;
  professional: PublicProfessional;
  service?: PublicService;
  date: ISODate | null;
  time: string | null;
  /** La cita es a domicilio: se muestra y se suma el recargo. */
  atHome: boolean;
}

/** Resumen de la selección actual (columna lateral en escritorio), como el talón de una cita. */
export function BookingSummary({ business, professional, service, date, time, atHome }: BookingSummaryProps) {
  const showPrice = service ? isPriceVisible(service) : false;
  return (
    <div className="rounded-xl border border-t-4 border-t-ink bg-background p-5">
      <h2 className="font-bold">Tu reserva</h2>
      {!service ? (
        <p className="mt-2 text-muted-foreground">Elige un servicio para empezar.</p>
      ) : (
        <dl className="mt-3 space-y-4">
          <div>
            <dt className="sr-only">Servicio</dt>
            <dd className="font-semibold">{service.name}</dd>
            <dd className="text-sm text-muted-foreground">
              {formatDuration(service.durationMinutes)} con {professional.displayName}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Fecha y hora</dt>
            <dd className="text-sm text-muted-foreground">{date ? capitalize(formatLongDate(date)) : "Fecha por elegir"}</dd>
            {date && time ? (
              <dd className="text-2xl font-extrabold tracking-[-0.02em] text-ink tabular-nums">
                {formatTimeRange(time, addMinutesToTime(time, service.durationMinutes))}
              </dd>
            ) : (
              date && <dd className="text-muted-foreground">Hora por elegir</dd>
            )}
          </div>
          {atHome && (
            <div className="flex items-start gap-2">
              <dt>
                <Home className="mt-0.5 size-4 text-ink" aria-label="Lugar" />
              </dt>
              <dd>
                A domicilio
                {service.homeVisitFee > 0 && showPrice && (
                  <span className="block text-sm text-muted-foreground">
                    Incluye {formatCurrency(service.homeVisitFee, business.currency)} por la visita
                  </span>
                )}
              </dd>
            </div>
          )}
          {showPrice && (
            <div className="flex items-baseline justify-between border-t border-dashed pt-3">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="text-xl font-extrabold tabular-nums">
                {formatCurrency(getListPrice(service, atHome), business.currency)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
