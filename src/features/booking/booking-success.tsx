import { CheckCircle2, Mail, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capitalize, formatCurrency, formatLongDate, formatTimeRange } from "@/lib/format";
import { describeHomeVisit, getDirectionsUrl, hasMapPoint } from "@/lib/maps";
import type { BookingConfirmation, Business } from "@/types";

interface BookingSuccessProps {
  confirmation: BookingConfirmation;
  business: Business;
  onBookAnother: () => void;
}

export function BookingSuccess({ confirmation, business, onBookAnother }: BookingSuccessProps) {
  const currency = business.currency;
  // En el local: dirección y botón "Cómo llegar" (al punto exacto si el negocio lo marcó).
  const atBusiness = !confirmation.homeVisit && (Boolean(business.address) || hasMapPoint(business));
  const rows = [
    { label: "Servicio", value: confirmation.serviceName },
    { label: "Fecha", value: capitalize(formatLongDate(confirmation.date)) },
    { label: "Hora", value: formatTimeRange(confirmation.startTime, confirmation.endTime) },
    { label: "Profesional", value: `${confirmation.professionalName} · ${confirmation.businessName}` },
    ...(confirmation.homeVisit ? [{ label: "A domicilio", value: describeHomeVisit(confirmation.homeVisit) }] : []),
    ...(atBusiness && business.address ? [{ label: "Lugar", value: business.address }] : []),
    ...(confirmation.showPrice ? [{ label: "Precio", value: formatCurrency(confirmation.price, currency) }] : []),
  ];

  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-background p-6 text-center shadow-sm sm:p-8" role="status">
      <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden />
      <h2 className="mt-4 text-2xl font-semibold tracking-tight">¡Cita reservada correctamente!</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tu reserva quedó registrada y está pendiente de confirmación por parte del profesional.
      </p>
      {confirmation.emailSent && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Mail className="size-3.5" aria-hidden /> Te enviamos un email de confirmación a {confirmation.clientEmail}
        </p>
      )}
      <dl className="mt-6 divide-y rounded-xl border text-left text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        {atBusiness && (
          <Button asChild size="lg">
            <a href={getDirectionsUrl(business)} target="_blank" rel="noreferrer">
              <Navigation /> Cómo llegar
            </a>
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onBookAnother}>
          Reservar otra cita
        </Button>
      </div>
    </div>
  );
}
