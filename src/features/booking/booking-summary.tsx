import { CalendarDays, Clock, Home, Wallet } from "lucide-react";
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

/** Resumen de la selección actual (columna lateral en escritorio). */
export function BookingSummary({ business, professional, service, date, time, atHome }: BookingSummaryProps) {
  const showPrice = service ? isPriceVisible(service) : false;
  return (
    <div className="rounded-xl border bg-background p-5">
      <h2 className="text-sm font-semibold">Resumen de tu reserva</h2>
      {!service ? (
        <p className="mt-3 text-sm text-muted-foreground">Elige un servicio para comenzar.</p>
      ) : (
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="sr-only">Servicio</dt>
            <dd className="font-medium">{service.name}</dd>
            <dd className="text-muted-foreground">con {professional.displayName}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <dt>
              <Clock className="size-4 text-muted-foreground" aria-label="Duración" />
            </dt>
            <dd>{formatDuration(service.durationMinutes)}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <dt>
              <CalendarDays className="size-4 text-muted-foreground" aria-label="Fecha y hora" />
            </dt>
            <dd>
              {date ? capitalize(formatLongDate(date)) : "Fecha por elegir"}
              {date && time && (
                <span className="block text-muted-foreground">
                  {formatTimeRange(time, addMinutesToTime(time, service.durationMinutes))}
                </span>
              )}
            </dd>
          </div>
          {atHome && (
            <div className="flex items-center gap-2.5">
              <dt>
                <Home className="size-4 text-muted-foreground" aria-label="Lugar" />
              </dt>
              <dd>
                A domicilio
                {service.homeVisitFee > 0 && showPrice && (
                  <span className="block text-muted-foreground">
                    Incluye recargo de {formatCurrency(service.homeVisitFee, business.currency)}
                  </span>
                )}
              </dd>
            </div>
          )}
          {showPrice && (
            <div className="flex items-center justify-between border-t pt-3">
              <dt className="flex items-center gap-2.5 text-muted-foreground">
                <Wallet className="size-4" aria-hidden /> Total
              </dt>
              <dd className="text-lg font-semibold tabular-nums">
                {formatCurrency(getListPrice(service, atHome), business.currency)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
