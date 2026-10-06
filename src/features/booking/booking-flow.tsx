import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateBooking } from "@/hooks/queries/use-public-booking";
import { getMinNoticeHours } from "@/lib/availability";
import { DataError, getErrorMessage } from "@/lib/data";
import { capitalize, formatLongDate, plural } from "@/lib/format";
import { addDaysISO, addMinutesToTime } from "@/lib/time";
import type { PublicBookingInput } from "@/lib/validations/booking";
import type { BookingConfirmation, BusySlot, ISODate, PublicBusinessProfile } from "@/types";
import { BookingCalendar } from "./booking-calendar";
import { BookingSteps, type BookingStep } from "./booking-steps";
import { BookingSuccess } from "./booking-success";
import { BookingSummary } from "./booking-summary";
import { BusinessLocationCard } from "./business-location-card";
import { ConfirmStep } from "./confirm-step";
import { EMPTY_CONTACT, type ContactValues } from "./contact";
import { DetailsStep } from "./details-step";
import { ServiceStep } from "./service-step";
import { TimeSlots } from "./time-slots";
import { useBookingAvailability } from "./use-booking-availability";
import { useCaptcha } from "./use-captcha";
import { WhatsAppHelp } from "./whatsapp-help";

const STEP_COPY: Record<BookingStep, { title: string; description: string }> = {
  service: { title: "¿Qué servicio necesitas?", description: "Elige el servicio que quieres reservar." },
  datetime: { title: "Elige fecha y hora", description: "Sólo se muestran los horarios disponibles." },
  details: { title: "Tus datos", description: "Los necesitamos para confirmar tu cita." },
  confirm: { title: "Confirma tu reserva", description: "Revisa que todo esté correcto antes de reservar." },
};

export function BookingFlow({ slug, profile }: { slug: string; profile: PublicBusinessProfile }) {
  const { containerRef: captchaRef, getToken: getCaptchaToken } = useCaptcha(profile.captchaSiteKey);
  const createBooking = useCreateBooking(slug, getCaptchaToken);
  const [step, setStep] = useState<BookingStep>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState<ISODate | null>(null);
  const [requestedTime, setRequestedTime] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactValues>(EMPTY_CONTACT);
  const [pendingInput, setPendingInput] = useState<PublicBookingInput | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  /**
   * Horas que este navegador ya sabe ocupadas aunque la página aún no lo refleje (la página de
   * reservas se guarda unos segundos en la CDN): la que se acaba de reservar y la que se ocupó.
   */
  const [takenSlots, setTakenSlots] = useState<BusySlot[]>([]);
  const markTaken = (slot: BusySlot) => setTakenSlots((current) => [...current, slot]);
  const effectiveProfile = useMemo(
    () => (takenSlots.length ? { ...profile, busySlots: [...profile.busySlots, ...takenSlots] } : profile),
    [profile, takenSlots],
  );

  const { business, professional, services } = profile;
  const service = services.find((s) => s.id === serviceId);
  const { today, availableDates, date, slots, time } = useBookingAvailability(
    effectiveProfile,
    service,
    requestedDate,
    requestedTime,
  );
  // Si el servicio deja de estar disponible, se vuelve al primer paso.
  const currentStep: BookingStep = service ? step : "service";
  const atHome = service?.location === "home" || (currentStep === "confirm" && Boolean(pendingInput?.homeVisit));
  // El local sólo interesa si el cliente va a ir: no en citas a domicilio ni si todo es a domicilio.
  const showLocation = !atHome && services.some((s) => s.location !== "home");

  const reset = () => {
    setConfirmation(null);
    setServiceId(null);
    setRequestedDate(null);
    setRequestedTime(null);
    setPendingInput(null);
    setStep("service");
  };

  const submit = async (input: PublicBookingInput) => {
    try {
      const booked = await createBooking.mutateAsync(input);
      markTaken({ date: booked.date, startTime: booked.startTime, endTime: booked.endTime });
      setConfirmation(booked);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      if (error instanceof DataError && error.code === "conflict" && service) {
        // Alguien la reservó antes: se oculta al momento para no volver a elegirla.
        markTaken({
          date: input.date,
          startTime: input.startTime,
          endTime: addMinutesToTime(input.startTime, service.durationMinutes),
        });
        toast.error(getErrorMessage(error));
        setRequestedTime(null);
        setStep("datetime");
      } else if (error instanceof DataError && error.code === "daily_limit") {
        // Ya tiene el máximo de citas ese día: puede elegir otro día.
        toast.error(getErrorMessage(error), { duration: 10_000 });
        setRequestedTime(null);
        setStep("datetime");
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  };

  if (confirmation) {
    return <BookingSuccess confirmation={confirmation} business={business} onBookAnother={reset} />;
  }

  const minNotice = getMinNoticeHours(business.bookingSettings);
  const copy =
    currentStep === "datetime"
      ? {
          ...STEP_COPY.datetime,
          description:
            minNotice > 0
              ? `Sólo se muestran los horarios disponibles. Reserva con al menos ${plural(minNotice, "hora", "horas")} de anticipación.`
              : "Sólo se muestran los horarios disponibles.",
        }
      : STEP_COPY[currentStep];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div>
        <BookingSteps current={currentStep} onStepClick={setStep} />
        <section className="space-y-6 rounded-2xl border bg-background p-4 sm:p-7" aria-labelledby="booking-step-title">
          <div className="space-y-1">
            <h2 id="booking-step-title" className="text-2xl font-extrabold tracking-[-0.02em]">
              {copy.title}
            </h2>
            <p className="text-muted-foreground">{copy.description}</p>
          </div>

          {currentStep === "service" && (
            <ServiceStep
              services={services}
              currency={business.currency}
              selectedId={serviceId}
              onSelect={(selected) => {
                setServiceId(selected.id);
                setRequestedDate(null);
                setRequestedTime(null);
                setStep("datetime");
              }}
            />
          )}

          {currentStep === "datetime" && service && (
            <>
              {availableDates.size === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  No hay horarios disponibles en los próximos {business.bookingSettings.maxAdvanceDays} días. Prueba con
                  otro servicio o vuelve más tarde.
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-[minmax(0,300px)_1fr]">
                  <BookingCalendar
                    key={service.id}
                    today={today}
                    lastDate={addDaysISO(today, business.bookingSettings.maxAdvanceDays)}
                    availableDates={availableDates}
                    selected={date}
                    onSelect={(day) => {
                      setRequestedDate(day);
                      setRequestedTime(null);
                    }}
                  />
                  <div>
                    {date && <p className="mb-3 text-sm font-medium">{capitalize(formatLongDate(date))}</p>}
                    <TimeSlots slots={slots} selected={time} onSelect={setRequestedTime} />
                  </div>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t pt-4">
                <Button variant="ghost" onClick={() => setStep("service")}>
                  <ArrowLeft /> Cambiar servicio
                </Button>
                <Button size="lg" disabled={!date || !time} onClick={() => setStep("details")}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {currentStep === "confirm" && service && pendingInput && time && (
            <ConfirmStep
              business={business}
              professional={professional}
              service={service}
              input={pendingInput}
              knownClientName={contact.knownClientName}
              submitting={createBooking.isPending}
              onConfirm={() => submit(pendingInput)}
              onEdit={() => setStep("details")}
            />
          )}

          {currentStep === "details" && service && date && time && (
            <>
              <DetailsStep
                slug={slug}
                getCaptchaToken={getCaptchaToken}
                selection={{ serviceId: service.id, date, startTime: time }}
                service={service}
                business={business}
                initialValues={contact}
                onContinue={(input, values) => {
                  setContact(values);
                  setPendingInput(input);
                  setStep("confirm");
                }}
              />
              <Button variant="ghost" onClick={() => setStep("datetime")}>
                <ArrowLeft /> Cambiar fecha u hora
              </Button>
            </>
          )}
          {/* CAPTCHA: sólo ocupa espacio si Cloudflare pide marcar la casilla. */}
          <div ref={captchaRef} className="flex justify-center empty:hidden" />
          {(currentStep === "details" || currentStep === "confirm") && !time && (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm">
              <p className="text-muted-foreground">La hora elegida ya no está disponible.</p>
              <Button variant="outline" className="mt-3" onClick={() => setStep("datetime")}>
                Elegir otra hora
              </Button>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:mt-11">
        <BookingSummary
          business={business}
          professional={professional}
          service={service}
          date={date}
          time={time}
          atHome={atHome}
        />
        {showLocation && <BusinessLocationCard business={business} />}
        <WhatsAppHelp business={business} />
      </aside>
    </div>
  );
}
