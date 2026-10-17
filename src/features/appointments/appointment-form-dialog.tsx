import { AlertTriangle, Lock, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ClientCombobox } from "@/features/clients/client-combobox";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { ProfessionalSelect } from "@/features/professionals/professional-select";
import { defaultAgendaId, meetingUrlPlace, useAgendas, useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import {
  useAppointments,
  useCreateAppointmentSeries,
  usePreviewAppointmentSeries,
  useSaveAppointment,
} from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { useErrorToast } from "@/hooks/use-error-toast";
import { SERIES_DEFAULT_COUNT, seriesFrequencyText } from "@/lib/appointment-series";
import { findConflictingAppointment, findOverlappingBlock, isWithinWorkingHours, offersService } from "@/lib/availability";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_CONFIG,
  BLOCKING_STATUSES,
  LOCKED_STATUS,
  canChangeStatus,
} from "@/lib/constants/appointment-status";
import { DURATION_OPTIONS, SERVICE_MODES } from "@/lib/constants/business";
import { capitalize, formatCurrency, formatDuration, formatShortDate, formatTimeRange, joinNames } from "@/lib/format";
import { describeHomeVisit } from "@/lib/maps";
import { addMinutesToTime, durationInMinutes } from "@/lib/time";
import {
  appointmentSchema,
  seriesRepeatSchema,
  type AppointmentInput,
  type AppointmentSeriesPreviewInput,
} from "@/lib/validations/appointment";
import { dateField, timeField } from "@/lib/validations/fields";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type {
  Appointment,
  AppointmentSeriesPreview,
  AppointmentStatus,
  HomeVisitAddress,
  ISODate,
  Service,
  ServiceMode,
  TimeString,
} from "@/types";
import {
  clearHomeVisitErrors,
  EMPTY_HOME_VISIT,
  getAppointmentClientNames,
  getListPrice,
  getPlace,
  seriesDayLabel,
  suggestStartTime,
} from "./appointment-utils";
import { ExtraClientsField } from "./extra-clients-field";
import { HomeVisitFields } from "./home-visit-fields";
import { SeriesFields, type SeriesRepeatValue } from "./series-fields";
import { SeriesReview, type SeriesReviewResult } from "./series-review";

export interface AppointmentDefaults {
  date?: ISODate;
  startTime?: TimeString;
  clientId?: string;
  /** Agenda propuesta (p. ej. la columna del calendario donde se hizo clic). */
  professionalId?: string;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment;
  defaults?: AppointmentDefaults;
}

export function AppointmentFormDialog({ open, onOpenChange, appointment, defaults }: AppointmentFormDialogProps) {
  // La lista de fechas de una serie (spec 011) reemplaza al formulario en el mismo diálogo.
  const [reviewing, setReviewing] = useState(false);
  const change = (next: boolean) => {
    if (!next) setReviewing(false);
    onOpenChange(next);
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar cita" : reviewing ? "Revisa las fechas" : "Nueva cita"}</DialogTitle>
          <DialogDescription>
            {appointment?.status === LOCKED_STATUS
              ? "Está completada: sólo se cambian sus notas."
              : appointment
              ? "Modifica los datos de la cita."
              : reviewing
                ? "Cambia la hora de las que chocan o quítalas, y crea las demás."
                : "Agenda una cita para uno de tus clientes."}
          </DialogDescription>
        </DialogHeader>
        <AppointmentForm appointment={appointment} defaults={defaults} onDone={() => change(false)} onReviewChange={setReviewing} />
      </DialogContent>
    </Dialog>
  );
}

type FormValues = Omit<AppointmentInput, "durationMinutes" | "price"> & { durationMinutes: number; price: number | string };

function AppointmentForm({
  appointment,
  defaults,
  onDone,
  onReviewChange,
}: {
  appointment?: Appointment;
  defaults?: AppointmentDefaults;
  onDone: () => void;
  /** Se pasa a la lista de fechas de la serie (o se vuelve al formulario). */
  onReviewChange: (reviewing: boolean) => void;
}) {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const { clients, services, clientsById, isPending } = useLookups();
  const { data: schedules = [] } = useSchedules();
  const { data: blockedTimes = [] } = useBlockedTimes();
  const saveAppointment = useSaveAppointment();
  const showError = useErrorToast();
  const agendas = useAgendas();
  const multiAgenda = useMultiAgendaAccess();
  // `name`: lo escrito en el buscador cuando el cliente aún no existe. `slot`: para cuál de los otros
  // pacientes (null: el principal).
  const [newClient, setNewClient] = useState<{ open: boolean; name: string; slot: number | null }>({ open: false, name: "", slot: null });
  const [errors, setErrors] = useState<FieldErrors>({});
  // «Repetir» (spec 011): sólo en una cita nueva. `review`: la lista de fechas, con lo que se pidió.
  const [repeat, setRepeat] = useState<SeriesRepeatValue>({ enabled: false, frequency: "weekly", count: String(SERIES_DEFAULT_COUNT) });
  const [review, setReview] = useState<{ preview: AppointmentSeriesPreview; input: AppointmentSeriesPreviewInput; key: number } | null>(null);
  const previewSeries = usePreviewAppointmentSeries();
  const createSeries = useCreateAppointmentSeries();
  const repeating = !appointment && repeat.enabled;
  // Una cita completada queda fija (spec 020): sólo se editan sus notas; lo demás se ve deshabilitado.
  const locked = appointment?.status === LOCKED_STATUS;
  // El navegador no entiende lo escrito en el precio (p. ej. "12,50" en algunos teléfonos): su valor llega vacío.
  const [priceUnreadable, setPriceUnreadable] = useState(false);

  const [values, setValues] = useState<FormValues>(() => {
    const date = appointment?.date ?? defaults?.date ?? now.date;
    return {
      clientId: appointment?.clientId ?? defaults?.clientId ?? "",
      extraClientIds: appointment?.extraClientIds ?? [],
      serviceId: appointment?.serviceId ?? "",
      date,
      startTime: appointment?.startTime ?? defaults?.startTime ?? (date === now.date ? suggestStartTime(now) : "09:00"),
      durationMinutes: appointment ? durationInMinutes(appointment.startTime, appointment.endTime) : 60,
      price: appointment?.price ?? 0,
      status: appointment?.status ?? "confirmed",
      notes: appointment?.notes ?? "",
      homeVisit: appointment?.homeVisit ?? null,
      isVirtual: appointment?.isVirtual ?? false,
      professionalId: appointment?.professionalId ?? defaults?.professionalId ?? "",
    };
  });
  // Sin elegir todavía (los profesionales cargan aparte): la propia o la primera.
  const professionalId = values.professionalId || defaultAgendaId(agendas);
  const professional = agendas.byId(professionalId);
  // Al editar una cita de una agenda ya inactiva, esa agenda sigue en la lista.
  const professionalOptions =
    professional && !agendas.selectable.some((p) => p.id === professional.id) ? [...agendas.selectable, professional] : agendas.selectable;

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Sin los de reservas online que el negocio aún no gestionó (`restricted`): no son todavía del profesional.
  const selectableClients = clients.filter((c) => (c.isActive && !c.restricted) || c.id === values.clientId);
  // Otros pacientes (sesiones de pareja): si el negocio lo permite o si la cita ya los tiene.
  const extraClientIds = values.extraClientIds ?? [];
  const canAddClients = Boolean(business?.multiClientAppointments);
  const showExtraClients = canAddClients || extraClientIds.length > 0;
  const selectableExtraClients = clients.filter((c) => (c.isActive && !c.restricted) || extraClientIds.includes(c.id));
  const setMainClient = (clientId: string) =>
    setValues((current) => ({
      ...current,
      clientId,
      // Si pasa a ser el principal, deja de estar entre los otros.
      extraClientIds: (current.extraClientIds ?? []).filter((id) => id !== clientId),
    }));
  const setExtraClient = (slot: number, clientId: string) =>
    set(
      "extraClientIds",
      extraClientIds.map((id, i) => (i === slot ? clientId : id)),
    );
  // Con varias agendas, los servicios que atiende el profesional elegido (y el de la cita, si es otro).
  const offered = (service: Service) => !professional || offersService(professional, service.id);
  const selectableServices = services.filter((s) => (s.isActive && offered(s)) || s.id === values.serviceId);
  const selectedService = services.find((s) => s.id === values.serviceId);
  // Servicio en pareja o en familia (spec 005): para cuántas personas es y cuántos pacientes faltan.
  // Sólo un aviso: se puede guardar igual (uno no vino, o aún no está registrado).
  const sessionPeople = canAddClients && selectedService ? (selectedService.peoplePerSession ?? 1) : 1;
  const missingPatients = Math.max(0, sessionPeople - 1 - extraClientIds.filter(Boolean).length);

  /** Cambia el lugar (local, domicilio o virtual); el precio sigue al de lista si no se editó a mano. */
  const applyPlace = (current: FormValues, service: Service | undefined, place: ServiceMode): FormValues => {
    const homeVisit = place === "home" ? (current.homeVisit ?? newHomeVisit()) : null;
    const previousList = service ? getListPrice(service, Boolean(current.homeVisit)) : null;
    const keepsListPrice = previousList !== null && Number(current.price) === previousList;
    return {
      ...current,
      homeVisit,
      isVirtual: place === "virtual",
      price: service && keepsListPrice ? getListPrice(service, Boolean(homeVisit)) : current.price,
    };
  };
  // Las modalidades del servicio (y la de la cita, si se editó una que ya no admite).
  const place = getPlace(values);
  const placeOptions = selectedService
    ? SERVICE_MODES.filter((mode) => selectedService.modes.includes(mode.value) || mode.value === place)
    : [];
  const newHomeVisit = (): HomeVisitAddress => ({
    ...EMPTY_HOME_VISIT,
    address: clientsById.get(values.clientId)?.address ?? "",
  });
  const updateHomeVisit = (patch: Partial<HomeVisitAddress>) => {
    setValues((current) => ({ ...current, homeVisit: { ...(current.homeVisit ?? EMPTY_HOME_VISIT), ...patch } }));
    setErrors((current) => clearHomeVisitErrors(current, patch));
  };
  const durationOptions = [...new Set([...DURATION_OPTIONS, values.durationMinutes])].sort((a, b) => a - b);

  // Para ver solapamientos sólo hacen falta las citas de ese día (no toda la agenda).
  const dayToCheck = dateField.safeParse(values.date).success ? values.date : now.date;
  const { data: appointments = [] } = useAppointments({ from: dayToCheck, to: dayToCheck }, { keepPrevious: true });

  // Comprobaciones en vivo: solapamiento (bloquea), fuera de horario y bloqueos (avisos).
  const timeWindow =
    values.date && timeField.safeParse(values.startTime).success
      ? {
          id: appointment?.id,
          professionalId: professionalId || undefined,
          date: values.date,
          startTime: values.startTime,
          endTime: addMinutesToTime(values.startTime, values.durationMinutes),
        }
      : null;
  // Mientras se guarda (o ya guardada), la agenda recargada trae esta misma cita: no es un solape.
  const saving = saveAppointment.isPending || saveAppointment.isSuccess;
  // Con «Repetir», un choque no bloquea: la lista de fechas lo marca y ahí se cambia la hora.
  const conflict =
    timeWindow && BLOCKING_STATUSES.has(values.status) && !saving && !repeating && !locked
      ? findConflictingAppointment(timeWindow, appointments)
      : undefined;
  const conflictMessage = conflict
    ? `Se solapa con la cita de ${getAppointmentClientNames(clientsById, conflict)} (${formatTimeRange(conflict.startTime, conflict.endTime)}).`
    : undefined;
  // El horario y los bloqueos que cuentan son los de esa agenda (y los de todo el negocio).
  const agendaSchedules = professionalId ? schedules.filter((s) => s.professionalId === professionalId) : schedules;
  const agendaBlocks = professionalId
    ? blockedTimes.filter((b) => b.professionalId === null || b.professionalId === professionalId)
    : blockedTimes;
  const outsideHours = timeWindow && !repeating && !locked ? !isWithinWorkingHours(agendaSchedules, timeWindow) : false;
  const block = timeWindow && !repeating && !locked ? findOverlappingBlock(agendaBlocks, timeWindow) : undefined;
  // Una serie es de citas por venir: Pendiente o Confirmada. Al editar, sólo los estados a los que puede pasar
  // (spec 020: una confirmada no vuelve a Pendiente).
  const statusOptions = repeating
    ? APPOINTMENT_STATUSES.filter((status) => status === "pending" || status === "confirmed")
    : appointment
      ? APPOINTMENT_STATUSES.filter((status) => status === appointment.status || canChangeStatus(appointment.status, status))
      : APPOINTMENT_STATUSES;
  const changeRepeat = (next: SeriesRepeatValue) => {
    setRepeat(next);
    if (next.enabled && values.status !== "pending" && values.status !== "confirmed") set("status", "confirmed");
  };

  /** «Revisar fechas»: la lista de la serie, calculada por la API (sabe el cupo y la agenda de cada fecha). */
  const reviewDates = async (input: AppointmentSeriesPreviewInput, key = 0) => {
    try {
      const preview = await previewSeries.mutateAsync(input);
      setReview({ preview, input, key });
      onReviewChange(true);
    } catch (error) {
      showError(error);
    }
  };

  const backToForm = () => {
    setReview(null);
    onReviewChange(false);
  };

  /** «Crear N citas»: el aviso dice cuántas se crearon y cuáles no (las quitadas y las que se ocuparon mientras tanto). */
  const handleCreateSeries = async ({ dates, left }: SeriesReviewResult) => {
    if (!review) return;
    try {
      const result = await createSeries.mutateAsync({ ...review.input, dates });
      const missing = [
        ...left.map((item) => seriesDayLabel(item.date).toLowerCase()),
        ...result.skipped.map((item) => `${seriesDayLabel(item.date).toLowerCase()} (${item.reason.charAt(0).toLowerCase()}${item.reason.slice(1)})`),
      ];
      const [first] = result.created;
      toast.success(`Se ${result.created.length === 1 ? "creó 1 cita" : `crearon ${result.created.length} citas`}`, {
        description: missing.length
          ? `No se ${missing.length === 1 ? "creó" : "crearon"}: ${joinNames(missing)}.`
          : `Desde el ${formatShortDate(first.date)} · ${seriesFrequencyText(result.series.frequency)} · ${formatTimeRange(first.startTime, first.endTime)}`,
        duration: missing.length ? 10_000 : undefined,
      });
      onDone();
    } catch (error) {
      showError(error);
      // Algo cambió mientras se revisaba (409 o 402): se vuelve a pedir la lista.
      await reviewDates(review.input, review.key + 1);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // Los espacios de «Otros pacientes» que quedaron sin elegir no cuentan.
    const result = validate(appointmentSchema, { ...values, extraClientIds: extraClientIds.filter(Boolean), professionalId });
    // Vacío o ilegible no es $0: se pide (el esquema rechaza el vacío con "Escribe el precio").
    const priceError = priceUnreadable && values.price === "" ? "Escribe sólo números, p. ej. 25.50" : undefined;
    if (repeating) {
      const repeatResult = validate(seriesRepeatSchema, { frequency: repeat.frequency, count: repeat.count });
      const seriesErrors: FieldErrors = {
        ...result.errors,
        ...(priceError ? { price: priceError } : {}),
        ...Object.fromEntries(Object.entries(repeatResult.errors).map(([key, message]) => [`repeat.${key}`, message])),
        ...(values.date && values.date < now.date ? { date: "La primera fecha de la serie no puede ser anterior a hoy." } : {}),
      };
      setErrors(seriesErrors);
      if (!result.success || !repeatResult.success || Object.keys(seriesErrors).length > 0 || previewSeries.isPending) return;
      await reviewDates({ appointment: result.data, repeat: repeatResult.data });
      return;
    }
    setErrors(priceError ? { ...result.errors, price: priceError } : result.errors);
    if (!result.success || priceError || conflict || saving) return;

    try {
      const saved = await saveAppointment.mutateAsync({ id: appointment?.id, input: result.data });
      // La fecha y la hora guardadas (no las del formulario, que pudo cambiarse mientras tanto).
      toast.success(appointment ? "Cita actualizada" : "Cita creada", {
        description: `${capitalize(formatShortDate(saved.date))} · ${formatTimeRange(saved.startTime, saved.endTime)}`,
      });
      onDone();
    } catch (error) {
      showError(error);
    }
  };

  if (review) {
    return (
      <SeriesReview
        key={review.key}
        preview={review.preview}
        frequency={review.input.repeat.frequency}
        durationMinutes={review.input.appointment.durationMinutes}
        creating={createSeries.isPending || previewSeries.isPending}
        onBack={backToForm}
        onCreate={handleCreateSeries}
      />
    );
  }

  if (isPending) {
    return (
      <div className="grid gap-4" aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!services.some((s) => s.isActive)) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm">
        <p className="font-medium">Primero crea un servicio</p>
        <p className="mt-1 text-muted-foreground">Las citas necesitan un servicio con duración y precio.</p>
        <Button asChild className="mt-4" onClick={onDone}>
          <Link to="/dashboard/services">Ir a servicios</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      {locked && (
        <p role="note" className="flex gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-medium">Completada · ya no se puede cambiar.</span> Sólo puedes editar sus notas; el pago y los
            comprobantes, desde la ficha.
          </span>
        </p>
      )}
      {/* Completada: todo menos las notas, deshabilitado (los Select de Radix lo reciben también a mano). */}
      <fieldset disabled={locked} className="grid min-w-0 gap-4">
      {professionalOptions.length > 1 && (
        <FormField
          label="Profesional"
          error={errors.professionalId}
          hint={selectedService && professional && !offered(selectedService) ? `${professional.displayName} no suele atender este servicio.` : undefined}
        >
          {(field) => (
            <ProfessionalSelect
              id={field.id}
              professionals={professionalOptions}
              value={professionalId}
              onValueChange={(value) => set("professionalId", value)}
              disabled={locked}
            />
          )}
        </FormField>
      )}

      <FormField label="Cliente" error={errors.clientId}>
        {(field) => (
          <div className="flex gap-2">
            <ClientCombobox
              {...field}
              className="min-w-0 flex-1"
              clients={selectableClients}
              value={values.clientId}
              onChange={setMainClient}
              onCreate={(name) => setNewClient({ open: true, name, slot: null })}
            />
            <Button type="button" variant="outline" onClick={() => setNewClient({ open: true, name: "", slot: null })}>
              <Plus /> Nuevo
            </Button>
          </div>
        )}
      </FormField>

      {showExtraClients && (
        <ExtraClientsField
          clients={selectableExtraClients}
          clientsById={clientsById}
          mainClientId={values.clientId}
          value={extraClientIds}
          onChange={(next) => set("extraClientIds", next)}
          canAdd={canAddClients}
          onCreate={(slot, name) => setNewClient({ open: true, name, slot })}
          error={errors.extraClientIds}
        />
      )}
      {missingPatients > 0 && (
        <p className="-mt-2 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Este servicio es para {sessionPeople} personas: {missingPatients === 1 ? "falta un paciente" : `faltan ${missingPatients} pacientes`}.
          Puedes guardar igual.
        </p>
      )}

      <FormField
        label="Servicio"
        error={errors.serviceId}
        hint={
          selectedService &&
          `${formatDuration(selectedService.durationMinutes)} · precio de lista ${formatCurrency(selectedService.price)}${
            selectedService.homeVisitFee > 0 ? ` (+${formatCurrency(selectedService.homeVisitFee)} a domicilio)` : ""
          }`
        }
      >
        {(field) => (
          <Select
            value={values.serviceId}
            disabled={locked}
            onValueChange={(serviceId) => {
              const service = services.find((s) => s.id === serviceId);
              setValues((current) => {
                // El lugar se ajusta a lo que admite el nuevo servicio.
                const currentPlace = getPlace(current);
                const nextPlace = !service || service.modes.includes(currentPlace) ? currentPlace : service.modes[0];
                const homeVisit = nextPlace === "home" ? (current.homeVisit ?? newHomeVisit()) : null;
                // En un servicio para varias personas se abren los espacios de los otros pacientes; los
                // vacíos que sobran se quitan.
                const people = canAddClients && service ? (service.peoplePerSession ?? 1) : 1;
                const chosen = (current.extraClientIds ?? []).filter(Boolean);
                const extraClientIds = [...chosen, ...Array<string>(Math.max(0, people - 1 - chosen.length)).fill("")];
                return {
                  ...current,
                  serviceId,
                  extraClientIds,
                  homeVisit,
                  isVirtual: nextPlace === "virtual",
                  durationMinutes: service?.durationMinutes ?? current.durationMinutes,
                  price: service ? getListPrice(service, Boolean(homeVisit)) : current.price,
                };
              });
            }}
          >
            <SelectTrigger {...field} className="w-full">
              <SelectValue placeholder="Selecciona un servicio" />
            </SelectTrigger>
            <SelectContent position="popper">
              {selectableServices.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      {selectedService && (placeOptions.length > 1 || place !== "business") && (
        <div className="grid gap-4 rounded-xl border bg-muted/30 p-3">
          <FormField
            label="Lugar"
            error={errors.isVirtual}
            hint={
              values.isVirtual
                ? professional?.meetingUrl
                  ? `Por videollamada: ${professional.meetingUrl}`
                  : `Por videollamada. Aún no hay enlace: agrégalo en ${meetingUrlPlace(multiAgenda)}.`
                : undefined
            }
          >
            {(field) => (
              <Select
                value={place}
                disabled={placeOptions.length === 1 || locked}
                onValueChange={(next) => setValues((current) => applyPlace(current, selectedService, next as ServiceMode))}
              >
                <SelectTrigger {...field} className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {placeOptions.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          {values.homeVisit && locked && <p className="text-sm text-muted-foreground">{describeHomeVisit(values.homeVisit)}</p>}
          {values.homeVisit && !locked && (
            <HomeVisitFields
              value={values.homeVisit}
              onChange={updateHomeVisit}
              errors={errors}
              timezone={business?.timezone ?? ""}
              centerOnAddress={business?.address || undefined}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Fecha" error={errors.date}>
          {(field) => <Input {...field} type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />}
        </FormField>
        <FormField label="Hora" error={errors.startTime}>
          {(field) => (
            <Input
              {...field}
              type="time"
              step={300}
              value={values.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Duración" error={errors.durationMinutes}>
          {(field) => (
            <Select
              value={String(values.durationMinutes)}
              disabled={locked}
              onValueChange={(minutes) => set("durationMinutes", Number(minutes))}
            >
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {durationOptions.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {formatDuration(minutes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>

      {!appointment && <SeriesFields value={repeat} onChange={changeRepeat} errors={errors} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Precio (USD)" error={errors.price}>
        {(field) => (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              {...field}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="pl-6"
              value={values.price}
              onChange={(e) => {
                set("price", e.target.value);
                setPriceUnreadable(e.target.validity.badInput);
              }}
            />
          </div>
        )}
      </FormField>
      <FormField label="Estado" error={errors.status} hint={repeating ? "Una serie queda pendiente o confirmada." : undefined}>
        {(field) => (
          <Select value={values.status} disabled={locked} onValueChange={(status) => set("status", status as AppointmentStatus)}>
            <SelectTrigger {...field} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  <span className={`size-2 rounded-full ${APPOINTMENT_STATUS_CONFIG[status].dot}`} aria-hidden />
                  {APPOINTMENT_STATUS_CONFIG[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      </div>
      </fieldset>

      <FormField label="Notas" error={errors.notes} optional>
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            placeholder="Motivo de la cita, indicaciones…"
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        )}
      </FormField>

      {conflictMessage && (
        <p role="alert" className="flex gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {conflictMessage}
        </p>
      )}
      {!conflictMessage && (outsideHours || block) && (
        <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {block
            ? `Este horario está bloqueado (${block.reason}). Puedes guardarla igualmente.`
            : "La cita queda fuera de tu horario de atención. Puedes guardarla igualmente."}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={saving || previewSeries.isPending} disabled={Boolean(conflict)}>
          {appointment ? "Guardar cambios" : repeating ? "Revisar fechas" : "Crear cita"}
        </SubmitButton>
      </DialogFooter>
    </form>

    {/* Fuera del <form>: los eventos de React atraviesan portales y el submit llegaría al formulario de la cita. */}
    <ClientFormDialog
      open={newClient.open}
      onOpenChange={(open) => setNewClient((current) => ({ ...current, open }))}
      defaultName={newClient.name}
      onSaved={(client) => (newClient.slot === null ? setMainClient(client.id) : setExtraClient(newClient.slot, client.id))}
    />
    </>
  );
}
