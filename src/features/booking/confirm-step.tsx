import { CalendarDays, Clock, MapPin, Pencil, ShieldCheck, User, Video } from "lucide-react";
import type { ReactNode, RefCallback } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { capitalize, formatCurrency, formatDuration, formatLongDate, formatPrice, formatTimeRange, isPriceVisible } from "@/lib/format";
import { getListPrice } from "@/features/appointments/appointment-utils";
import { describeHomeVisit, getPlaceMapsUrl } from "@/lib/maps";
import { addMinutesToTime } from "@/lib/time";
import type { PublicBookingInput } from "@/lib/validations/booking";
import type { PublicBusiness, PublicProfessional, PublicService } from "@/types";
import { TimezoneNote } from "./timezone-note";
import { CAPTCHA_BOX_CLASS } from "./use-captcha";

interface ConfirmStepProps {
  /** Caja del CAPTCHA (ver useCaptcha): junto al botón de reservar, para que se vea en el móvil. */
  captchaRef: RefCallback<HTMLDivElement>;
  business: PublicBusiness;
  /** null: "el primero disponible" (se sabe quién al reservar). */
  professional: PublicProfessional | null;
  service: PublicService;
  input: PublicBookingInput;
  /** Nombre para saludar si la cédula ya era de un cliente del negocio. */
  knownClientName: string | null;
  submitting: boolean;
  onConfirm: () => void;
  onEdit: () => void;
}

/** Revisión final antes de reservar: todo lo que el cliente va a confirmar, en un vistazo. */
export function ConfirmStep({
  captchaRef,
  business,
  professional,
  service,
  input,
  knownClientName,
  submitting,
  onConfirm,
  onEdit,
}: ConfirmStepProps) {
  const { bookingSettings } = business;
  const showPrice = isPriceVisible(service);
  return (
    <div className="space-y-5">
      <dl className="divide-y rounded-xl border">
        <Row icon={CalendarDays} label="Cita">
          <p className="font-semibold">{service.name}</p>
          <p className="text-muted-foreground">{capitalize(formatLongDate(input.date))}</p>
          <p className="text-xl font-extrabold text-ink tabular-nums">
            {formatTimeRange(input.startTime, addMinutesToTime(input.startTime, service.durationMinutes))}
          </p>
          <TimezoneNote timezone={business.timezone} date={input.date} time={input.startTime} className="mt-1" />
        </Row>
        <Row icon={Clock} label={showPrice ? "Duración y precio" : "Duración"}>
          {formatDuration(service.durationMinutes)}
          {showPrice && (
            <>
              <span className="block font-semibold tabular-nums">
                {formatPrice(getListPrice(service, Boolean(input.homeVisit)), business.currency)}
              </span>
              {input.homeVisit && service.homeVisitFee > 0 && (
                <span className="block text-muted-foreground">
                  Incluye recargo a domicilio de {formatCurrency(service.homeVisitFee, business.currency)}
                </span>
              )}
            </>
          )}
        </Row>
        <Row icon={input.isVirtual ? Video : MapPin} label="Lugar">
          {input.isVirtual
            ? `Videollamada con ${professional?.displayName ?? "el primer profesional disponible"}, ${business.name}`
            : professional
              ? `${professional.displayName}, ${business.name}`
              : `${business.name} (con el primer profesional disponible)`}
          {input.isVirtual ? (
            <span className="block text-muted-foreground">Recibirás el enlace para entrar con la confirmación.</span>
          ) : input.homeVisit ? (
            <a
              href={getPlaceMapsUrl(input.homeVisit)}
              target="_blank"
              rel="noreferrer"
              className="block text-muted-foreground hover:text-foreground hover:underline"
            >
              A domicilio: {describeHomeVisit(input.homeVisit)}. Ver en el mapa
            </a>
          ) : business.address && (
            <a
              href={getPlaceMapsUrl(business)}
              target="_blank"
              rel="noreferrer"
              className="block text-muted-foreground hover:text-foreground hover:underline"
            >
              {business.address}. Ver en el mapa
            </a>
          )}
        </Row>
        <Row icon={User} label="Tus datos">
          <span className="font-semibold">{knownClientName ?? input.name}</span>
          <span className="block text-muted-foreground tabular-nums">Cédula {input.documentId}</span>
          <span className="block text-muted-foreground">
            {knownClientName ? "Usaremos tus datos de contacto registrados" : `${input.email}, ${input.phone}`}
          </span>
          {input.notes && <span className="mt-1 block text-muted-foreground italic">“{input.notes}”</span>}
        </Row>
      </dl>

      {bookingSettings.allowCancellations && bookingSettings.cancellationPolicy && (
        <p className="flex gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {bookingSettings.cancellationPolicy}
        </p>
      )}

      <div>
        {/* CAPTCHA de la reserva, junto al botón: sólo ocupa espacio si Cloudflare pide marcar la casilla. */}
        <div ref={captchaRef} className={CAPTCHA_BOX_CLASS} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onEdit} disabled={submitting}>
            <Pencil /> Editar mis datos
          </Button>
          <SubmitButton type="button" size="lg" className="h-11 px-6 text-sm" loading={submitting} loadingText="Reservando…" onClick={onConfirm}>
            Confirmar reserva
          </SubmitButton>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground sm:text-right">
        Al confirmar, {business.name} usará tus datos para gestionar tu cita, según nuestra{" "}
        {/* En otra pestaña: así no se pierde la reserva a medio hacer. */}
        <a href="/privacidad" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
          política de privacidad
        </a>
        .
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      {/* Un email o una nota largos sin espacios se parten en vez de ensanchar la página en el móvil. */}
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
