import { Mail, Navigation, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capitalize, formatLongDate, formatPrice } from "@/lib/format";
import { BankTransferCard } from "@/features/payments/bank-transfer-card";
import { describeHomeVisit, getDirectionsUrl, hasMapPoint } from "@/lib/maps";
import { cn } from "@/lib/utils";
import { getReceiptWhatsAppUrl } from "@/lib/whatsapp";
import type { BookingConfirmation, PublicBusiness } from "@/types";
import { TimezoneNote } from "./timezone-note";

interface BookingSuccessProps {
  confirmation: BookingConfirmation;
  business: PublicBusiness;
  /** Cómo se presentó al reservar (para el mensaje de WhatsApp con el comprobante). */
  clientName: string;
  onBookAnother: () => void;
}

/**
 * La cita queda apuntada: la hora reservada se marca con el resaltador. Si la agenda cobra por
 * transferencia, al lado (debajo en el móvil) van los datos para pagar y el envío del comprobante.
 */
export function BookingSuccess({ confirmation, business, clientName, onBookAnother }: BookingSuccessProps) {
  const currency = business.currency;
  // En el local: dirección y botón "Cómo llegar" (al punto exacto si el negocio lo marcó).
  const atBusiness =
    !confirmation.homeVisit && !confirmation.isVirtual && (Boolean(business.address) || hasMapPoint(business));
  const rows = [
    { label: "Servicio", value: confirmation.serviceName },
    { label: "Profesional", value: confirmation.professionalName },
    ...(confirmation.homeVisit ? [{ label: "A domicilio", value: describeHomeVisit(confirmation.homeVisit) }] : []),
    ...(confirmation.isVirtual
      ? [{ label: "Lugar", value: confirmation.meetingUrl ? "Videollamada" : "Videollamada (te enviaremos el enlace)" }]
      : []),
    ...(atBusiness && business.address ? [{ label: "Lugar", value: business.address }] : []),
    ...(confirmation.showPrice ? [{ label: "Precio", value: formatPrice(confirmation.price, currency) }] : []),
  ];

  const { payment } = confirmation;

  return (
    // Con pago por transferencia, en pantallas anchas los datos van a la derecha, a la misma altura.
    <div className={cn("mx-auto grid grid-cols-1 gap-4", payment ? "max-w-5xl items-start lg:grid-cols-2" : "max-w-xl")}>
      <div className="min-w-0 rounded-2xl border bg-background p-6 sm:p-9" role="status">
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
        <TimezoneNote
          timezone={business.timezone}
          date={confirmation.date}
          time={confirmation.startTime}
          className="mt-3 text-sm"
        />

        <dl className="mt-7 divide-y border-y">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 py-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 text-right font-semibold [overflow-wrap:anywhere]">{row.value}</dd>
            </div>
          ))}
        </dl>

        {confirmation.emailSent && (
          <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
            <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0 [overflow-wrap:anywhere]">Te enviamos un email de confirmación a {confirmation.clientEmail}</span>
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          {confirmation.meetingUrl && (
            <Button asChild size="lg" className="h-11 px-5">
              <a href={confirmation.meetingUrl} target="_blank" rel="noreferrer">
                <Video /> Enlace de la videollamada
              </a>
            </Button>
          )}
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
      {payment && (
        <BankTransferCard
          bankAccount={payment.bankAccount}
          amount={confirmation.showPrice ? confirmation.price : null}
          currency={currency}
          token={payment.token}
          receiptsEnabled={payment.receiptsEnabled}
          whatsappUrl={getReceiptWhatsAppUrl(business, { clientName, ...confirmation })}
        />
      )}
    </div>
  );
}
