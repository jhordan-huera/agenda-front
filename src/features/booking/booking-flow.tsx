import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPlace } from "@/features/appointments/appointment-utils";
import { useCreateBooking } from "@/hooks/queries/use-public-booking";
import { getMinNoticeHours, offersService } from "@/lib/availability";
import { DataError, getErrorMessage } from "@/lib/data";
import { capitalize, formatLongDate, plural } from "@/lib/format";
import { addDaysISO, addMinutesToTime } from "@/lib/time";
import type { PublicBookingInput } from "@/lib/validations/booking";
import type { BookingConfirmation, BusySlot, ISODate, PublicBusinessProfile, PublicService, ServiceMode } from "@/types";
import { BookingCalendar } from "./booking-calendar";
import { BookingSteps, type BookingStep } from "./booking-steps";
import { BookingSuccess } from "./booking-success";
import { BookingSummary } from "./booking-summary";
import { BusinessLocationCard } from "./business-location-card";
import { ConfirmStep } from "./confirm-step";
import { initialContact, type ContactValues } from "./contact";
import { ProfessionalStep } from "./professional-step";
import { DetailsStep } from "./details-step";
import { forgetSavedContact, saveContact } from "./saved-contact";
import { ServiceStep } from "./service-step";
import { TimeSlots } from "./time-slots";
import { TimezoneNote } from "./timezone-note";
import { useBookingAvailability } from "./use-booking-availability";
import { useCaptcha } from "./use-captcha";
import { WhatsAppHelp } from "./whatsapp-help";

/**
 * Errores que el paciente no arregla eligiendo otra hora: los datos no coinciden con su ficha, el
 * negocio llegó a su tope de reservas online del día, no se pudo pasar el CAPTCHA… Se muestran junto
 * al botón de reservar, con el WhatsApp del negocio.
 */
const BLOCKING_ERRORS = new Set(["forbidden", "rate_limited", "plan_limit", "unavailable"]);

/** Aviso de "se perdió la respuesta": se cierra si el reintento confirma la reserva. */
const LOST_RESPONSE_TOAST = "booking-lost-response";

const STEP_COPY: Record<BookingStep, { title: string; description: string }> = {
  service: { title: "¿Qué servicio necesitas?", description: "Elige el servicio que quieres reservar." },
  professional: { title: "¿Con quién quieres atenderte?", description: "Elige un profesional o el primero disponible." },
  datetime: { title: "Elige fecha y hora", description: "Sólo se muestran los horarios disponibles." },
  details: { title: "Tus datos", description: "Los necesitamos para confirmar tu cita." },
  confirm: { title: "Confirma tu reserva", description: "Revisa que todo esté correcto antes de reservar." },
};

export function BookingFlow({ slug, profile }: { slug: string; profile: PublicBusinessProfile }) {
  const { containerRef: captchaRef, getToken: getCaptchaToken } = useCaptcha(profile.captchaSiteKey);
  const createBooking = useCreateBooking(slug, getCaptchaToken);
  const [step, setStep] = useState<BookingStep>("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  /** Id del profesional, ANY_PROFESSIONAL ("el primero disponible") o null si aún no se eligió. */
  const [professionalChoice, setProfessionalChoice] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState<ISODate | null>(null);
  const [requestedTime, setRequestedTime] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactValues>(initialContact);
  const [pendingInput, setPendingInput] = useState<PublicBookingInput | null>(null);
  /** Por qué no se pudo reservar, si el paciente tiene que revisar sus datos o escribir al negocio. */
  const [bookingError, setBookingError] = useState<string | null>(null);
  /**
   * Reserva enviada cuya respuesta se perdió (se cortó la conexión): pudo quedar hecha. Se deja
   * confirmarla otra vez aunque su hora ya figure ocupada; la API devuelve la cita que ya existe.
   */
  const [unconfirmedInput, setUnconfirmedInput] = useState<PublicBookingInput | null>(null);
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

  const { business, services } = profile;
  const service = services.find((s) => s.id === serviceId);
  // Quiénes atienden el servicio y si se le pregunta al paciente con quién (el negocio puede no hacerlo).
  const eligibleFor = (target: PublicService | undefined) =>
    target ? profile.professionals.filter((professional) => offersService(professional, target.id)) : [];
  const asksProfessionalFor = (target: PublicService | undefined) =>
    business.bookingSettings.chooseProfessional !== false && eligibleFor(target).length > 1;
  const eligible = eligibleFor(service);
  const asksProfessional = asksProfessionalFor(service);
  const chosen = asksProfessional ? eligible.find((professional) => professional.id === professionalChoice) : undefined;
  // La agenda que se muestra: la elegida, la única que atiende el servicio o ninguna ("el primero disponible").
  const shownProfessional = chosen ?? (eligible.length === 1 ? eligible[0] : profile.professionals.length === 1 ? profile.professionals[0] : null);
  const agendaIds = chosen ? [chosen.id] : eligible.map((professional) => professional.id);
  const { today, availableDates, date, slots, time } = useBookingAvailability(
    effectiveProfile,
    service,
    agendaIds,
    requestedDate,
    requestedTime,
  );
  const steps: BookingStep[] = asksProfessional
    ? ["service", "professional", "datetime", "details", "confirm"]
    : ["service", "datetime", "details", "confirm"];
  // Si el servicio deja de estar disponible, se vuelve al primer paso; sin elegir profesional, a ese paso.
  const currentStep: BookingStep = !service
    ? "service"
    : step === "professional" && !asksProfessional
      ? "datetime"
      : asksProfessional && !professionalChoice && step !== "service"
        ? "professional"
        : step;
  // Mientras se reserva, o para reintentar tras perder la respuesta, se sigue mostrando la hora
  // enviada aunque al recargar la disponibilidad ya figure ocupada (por esta misma reserva).
  const holdsPendingTime =
    currentStep === "confirm" && pendingInput !== null && (createBooking.isPending || unconfirmedInput === pendingInput);
  const shownTime = time ?? (holdsPendingTime ? pendingInput.startTime : null);

  // Al cambiar de paso, se sube al inicio del paso nuevo si quedó por encima de la pantalla (en el
  // móvil, los botones para avanzar quedan abajo).
  const stepRef = useRef<HTMLDivElement>(null);
  const shownStep = useRef(currentStep);
  useEffect(() => {
    if (shownStep.current === currentStep) return;
    shownStep.current = currentStep;
    const element = stepRef.current;
    if (!element || element.getBoundingClientRect().top >= 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [currentStep]);

  // Dónde será la cita: la única modalidad del servicio o, al confirmar, la que eligió el cliente.
  const place: ServiceMode | null = !service
    ? null
    : currentStep === "confirm" && pendingInput
      ? getPlace(pendingInput)
      : service.modes.length === 1
        ? service.modes[0]
        : null;
  // El local sólo interesa si el cliente va a ir: no en citas a domicilio o virtuales, ni si nada se atiende en el local.
  const showLocation = (place === null || place === "business") && services.some((s) => s.modes.includes("business"));

  const reset = () => {
    setConfirmation(null);
    setServiceId(null);
    setProfessionalChoice(null);
    setRequestedDate(null);
    setRequestedTime(null);
    setPendingInput(null);
    setUnconfirmedInput(null);
    setBookingError(null);
    setStep("service");
  };

  const submit = async (input: PublicBookingInput) => {
    setBookingError(null);
    try {
      const booked = await createBooking.mutateAsync({ ...input, professionalId: chosen?.id ?? null });
      markTaken({ date: booked.date, startTime: booked.startTime, endTime: booked.endTime, professionalId: booked.professionalId });
      // Sus datos quedan en este navegador para la próxima vez (sólo si lo pidió).
      if (contact.remember) saveContact(input);
      else forgetSavedContact();
      setContact((current) => ({ ...current, fromSaved: current.remember }));
      // Si antes se perdió la respuesta, el aviso ya no hace falta: aquí está la confirmación.
      toast.dismiss(LOST_RESPONSE_TOAST);
      setConfirmation(booked);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const lostResponse = error instanceof DataError && error.code === "network";
      setUnconfirmedInput(lostResponse ? input : null);
      if (lostResponse) {
        // La reserva pudo llegar aunque no llegara la respuesta: al reintentar, si ya quedó hecha,
        // la API devuelve esa misma cita (no la duplica) y se muestra como reservada.
        toast.error("No pudimos confirmar tu reserva", {
          id: LOST_RESPONSE_TOAST,
          description: "Revisa tu conexión y vuelve a pulsar «Confirmar reserva». Si ya quedó hecha, verás la confirmación.",
          duration: 15_000,
        });
      } else if (error instanceof DataError && error.code === "conflict" && service) {
        // Alguien la reservó antes: se oculta al momento (en las agendas que se ofrecían) para no volver a elegirla.
        for (const professionalId of agendaIds) {
          markTaken({
            date: input.date,
            startTime: input.startTime,
            endTime: addMinutesToTime(input.startTime, service.durationMinutes),
            professionalId,
          });
        }
        toast.error(getErrorMessage(error));
        setRequestedTime(null);
        setStep("datetime");
      } else if (error instanceof DataError && error.code === "daily_limit") {
        // Ya tiene el máximo de citas ese día: puede elegir otro día.
        toast.error(getErrorMessage(error), { duration: 10_000 });
        setRequestedTime(null);
        setStep("datetime");
      } else if (error instanceof DataError && BLOCKING_ERRORS.has(error.code)) {
        setBookingError(getErrorMessage(error));
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  };

  if (confirmation) {
    return (
      <BookingSuccess
        confirmation={confirmation}
        business={business}
        clientName={contact.name}
        onBookAnother={reset}
      />
    );
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div ref={stepRef} className="min-w-0 scroll-mt-4">
        <BookingSteps steps={steps} current={currentStep} onStepClick={setStep} />
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
                // Si el profesional elegido no atiende el nuevo servicio, se vuelve a preguntar.
                if (!eligibleFor(selected).some((professional) => professional.id === professionalChoice)) {
                  setProfessionalChoice(null);
                }
                setRequestedDate(null);
                setRequestedTime(null);
                setStep(asksProfessionalFor(selected) ? "professional" : "datetime");
              }}
            />
          )}

          {currentStep === "professional" && service && (
            <>
              <ProfessionalStep
                professionals={eligible}
                selectedId={professionalChoice}
                onSelect={(choice) => {
                  setProfessionalChoice(choice);
                  setRequestedDate(null);
                  setRequestedTime(null);
                  setStep("datetime");
                }}
              />
              <Button variant="ghost" onClick={() => setStep("service")}>
                <ArrowLeft /> Cambiar servicio
              </Button>
            </>
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
                  <div className="min-w-0">
                    {date && <p className="mb-3 text-sm font-medium">{capitalize(formatLongDate(date))}</p>}
                    <TimezoneNote timezone={business.timezone} date={date} className="mb-3" />
                    <TimeSlots
                      slots={slots}
                      selected={time}
                      onSelect={(slot) => {
                        // La hora se guarda con su día: si ese día se queda sin huecos, la hora deja de
                        // valer en vez de pasar a otro día sin avisar.
                        setRequestedDate(date);
                        setRequestedTime(slot);
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t pt-4">
                <Button variant="ghost" onClick={() => setStep(asksProfessional ? "professional" : "service")}>
                  <ArrowLeft /> {asksProfessional ? "Cambiar profesional" : "Cambiar servicio"}
                </Button>
                <Button size="lg" disabled={!date || !time} onClick={() => setStep("details")}>
                  Continuar
                </Button>
              </div>
            </>
          )}

          {currentStep === "confirm" && service && pendingInput && shownTime && (
            <ConfirmStep
              captchaRef={captchaRef}
              business={business}
              professional={shownProfessional}
              service={service}
              input={pendingInput}
              error={bookingError}
              submitting={createBooking.isPending}
              onConfirm={() => submit(pendingInput)}
              onEdit={() => {
                setBookingError(null);
                setStep("details");
              }}
            />
          )}

          {currentStep === "details" && service && date && time && (
            <>
              <DetailsStep
                selection={{ serviceId: service.id, date, startTime: time }}
                service={service}
                business={business}
                contact={contact}
                onContactChange={setContact}
                onContinue={(input) => {
                  setPendingInput(input);
                  setBookingError(null);
                  setStep("confirm");
                }}
              />
              <Button variant="ghost" onClick={() => setStep("datetime")}>
                <ArrowLeft /> Cambiar fecha u hora
              </Button>
            </>
          )}
          {(currentStep === "details" || currentStep === "confirm") && !shownTime && (
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
          professional={shownProfessional}
          service={service}
          date={date}
          time={shownTime}
          place={place}
        />
        {showLocation && <BusinessLocationCard business={business} />}
        <WhatsAppHelp business={business} />
      </aside>
    </div>
  );
}
