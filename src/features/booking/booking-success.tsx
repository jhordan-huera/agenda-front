import { Mail, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capitalize, formatCurrency, formatLongDate } from "@/lib/format";
import { describeHomeVisit, getDirectionsUrl, hasMapPoint } from "@/lib/maps";
import type { BookingConfirmation, PublicBusiness } from "@/types";

interface BookingSuccessProps {
  confirmation: BookingConfirmation;
  business: PublicBusiness;
  onBookAnother: () => void;
}

/** La cita queda apuntada: la hora reservada se marca con el resaltador. */
export function BookingSuccess({ confirmation, business, onBookAnother }: BookingSuccessProps) {
  const currency = business.currency;
  // En el local: dirección y botón "Cómo llegar" (al punto exacto si el negocio lo marcó).
  const atBusiness = !confirmation.homeVisit && (Boolean(business.address) || hasMapPoint(business));
  const rows = [
    { label: "Servicio", value: confirmation.serviceName },
    { label: "Profesional", value: confirmation.professionalName },
    ...(confirmation.homeVisit ? [{ label: "A domicilio", value: describeHomeVisit(confirmation.homeVisit) }] : []),
    ...(atBusiness && business.address ? [{ label: "Lugar", value: business.address }] : []),
    ...(confirmation.showPrice ? [{ label: "Precio", value: formatCurrency(confirmation.price, currency) }] : []),
  ];

  return (
    <div className="mx-auto max-w-xl rounded-2xl border bg-background p-6 sm:p-9" role="status">
      <h2 className="text-3xl font-extrabold tracking-[-0.02em]">¡Cita reservada correctamente!</h2>
      <p className="mt-2 text-muted-foreground">
        Queda pendiente hasta que {confirmation.professionalName} la confirme.
      </p>

      <p className="mt-7 text-lg">{capitalize(formatLongDate(confirmation.date))}</p>
      <p className="mt-1 text-5xl leading-none font-extrabold tracking-[-0.02em] text-ink tabular-nums">
        <span className="marker marker-sweep [--marker-delay:0.15s]">{confirmation.startTime}</span>
        <span className="ml-3 text-2xl font-bold tracking-normal text-muted-foreground">
          hasta las {confirmation.endTime}
        </span>
      </p>

      <dl className="mt-7 divide-y border-y">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 py-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>

      {confirmation.emailSent && (
        <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
          <Mail className="mt-0.5 size-4 shrink-0" aria-hidden /> Te enviamos un email de confirmación a {confirmation.clientEmail}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        {atBusiness && (
          <Button asChild size="lg" className="h-11 px-5">
            <a href={getDirectionsUrl(business)} target="_blank" rel="noreferrer">
              <Navigation /> Cómo llegar
            </a>
          </Button>
        )}
        <Button variant="outline" size="lg" className="h-11 px-5" onClick={onBookAnother}>
          Reservar otra cita
        </Button>
      </div>
    </div>
  );
}
