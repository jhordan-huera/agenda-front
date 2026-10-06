import { AlertTriangle, Plus } from "lucide-react";
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
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments, useSaveAppointment } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { useErrorToast } from "@/hooks/use-error-toast";
import { findConflictingAppointment, findOverlappingBlock, isWithinWorkingHours } from "@/lib/availability";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_CONFIG, BLOCKING_STATUSES } from "@/lib/constants/appointment-status";
import { DURATION_OPTIONS } from "@/lib/constants/business";
import { capitalize, formatCurrency, formatDuration, formatShortDate, formatTimeRange } from "@/lib/format";
import { addMinutesToTime, durationInMinutes } from "@/lib/time";
import { appointmentSchema, type AppointmentInput } from "@/lib/validations/appointment";
import { dateField, timeField } from "@/lib/validations/fields";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Appointment, AppointmentStatus, HomeVisitAddress, ISODate, Service, TimeString } from "@/types";
import { clearHomeVisitErrors, EMPTY_HOME_VISIT, getClientName, getListPrice, suggestStartTime } from "./appointment-utils";
import { HomeVisitFields } from "./home-visit-fields";

export interface AppointmentDefaults {
  date?: ISODate;
  startTime?: TimeString;
  clientId?: string;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment;
  defaults?: AppointmentDefaults;
}

export function AppointmentFormDialog({ open, onOpenChange, appointment, defaults }: AppointmentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{appointment ? "Editar cita" : "Nueva cita"}</DialogTitle>
          <DialogDescription>
            {appointment ? "Modifica los datos de la cita." : "Agenda una cita para uno de tus clientes."}
          </DialogDescription>
        </DialogHeader>
        <AppointmentForm appointment={appointment} defaults={defaults} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type FormValues = Omit<AppointmentInput, "durationMinutes" | "price"> & { durationMinutes: number; price: number | string };

function AppointmentForm({
  appointment,
  defaults,
  onDone,
}: {
  appointment?: Appointment;
  defaults?: AppointmentDefaults;
  onDone: () => void;
}) {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const { clients, services, clientsById, isPending } = useLookups();
  const { data: schedules = [] } = useSchedules();
  const { data: blockedTimes = [] } = useBlockedTimes();
  const saveAppointment = useSaveAppointment();
  const showError = useErrorToast();
  // `name`: lo escrito en el buscador cuando el cliente aún no existe.
  const [newClient, setNewClient] = useState({ open: false, name: "" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const [values, setValues] = useState<FormValues>(() => {
    const date = appointment?.date ?? defaults?.date ?? now.date;
    return {
      clientId: appointment?.clientId ?? defaults?.clientId ?? "",
      serviceId: appointment?.serviceId ?? "",
      date,
      startTime: appointment?.startTime ?? defaults?.startTime ?? (date === now.date ? suggestStartTime(now) : "09:00"),
      durationMinutes: appointment ? durationInMinutes(appointment.startTime, appointment.endTime) : 60,
      price: appointment?.price ?? 0,
      status: appointment?.status ?? "confirmed",
      notes: appointment?.notes ?? "",
      homeVisit: appointment?.homeVisit ?? null,
    };
  });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const selectableClients = clients.filter((c) => c.isActive || c.id === values.clientId);
  const selectableServices = services.filter((s) => s.isActive || s.id === values.serviceId);
  const selectedService = services.find((s) => s.id === values.serviceId);

  /** Cambia entre local y domicilio; el precio sigue al de lista si no se editó a mano. */
  const applyPlace = (current: FormValues, service: Service | undefined, homeVisit: HomeVisitAddress | null): FormValues => {
    const previousList = service ? getListPrice(service, Boolean(current.homeVisit)) : null;
    const keepsListPrice = previousList !== null && Number(current.price) === previousList;
    return {
      ...current,
      homeVisit,
      price: service && keepsListPrice ? getListPrice(service, Boolean(homeVisit)) : current.price,
    };
  };
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
          date: values.date,
          startTime: values.startTime,
          endTime: addMinutesToTime(values.startTime, values.durationMinutes),
        }
      : null;
  const conflict =
    timeWindow && BLOCKING_STATUSES.has(values.status)
      ? findConflictingAppointment(timeWindow, appointments)
      : undefined;
  const conflictMessage = conflict
    ? `Se solapa con la cita de ${getClientName(clientsById, conflict.clientId)} (${formatTimeRange(conflict.startTime, conflict.endTime)}).`
    : undefined;
  const outsideHours = timeWindow ? !isWithinWorkingHours(schedules, timeWindow) : false;
  const block = timeWindow ? findOverlappingBlock(blockedTimes, timeWindow) : undefined;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(appointmentSchema, values);
    setErrors(result.errors);
    if (!result.success || conflict) return;

    try {
      await saveAppointment.mutateAsync({ id: appointment?.id, input: result.data });
      toast.success(appointment ? "Cita actualizada" : "Cita creada", {
        description: timeWindow
          ? `${capitalize(formatShortDate(values.date))} · ${formatTimeRange(timeWindow.startTime, timeWindow.endTime)}`
          : undefined,
      });
      onDone();
    } catch (error) {
      showError(error);
    }
  };

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
      <FormField label="Cliente" error={errors.clientId}>
        {(field) => (
          <div className="flex gap-2">
            <ClientCombobox
              {...field}
              className="min-w-0 flex-1"
              clients={selectableClients}
              value={values.clientId}
              onChange={(clientId) => set("clientId", clientId)}
              onCreate={(name) => setNewClient({ open: true, name })}
            />
            <Button type="button" variant="outline" onClick={() => setNewClient({ open: true, name: "" })}>
              <Plus /> Nuevo
            </Button>
          </div>
        )}
      </FormField>

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
            onValueChange={(serviceId) => {
              const service = services.find((s) => s.id === serviceId);
              setValues((current) => {
                // El lugar se ajusta a lo que admite el nuevo servicio.
                const homeVisit =
                  service?.location === "business" ? null : service?.location === "home" ? (current.homeVisit ?? newHomeVisit()) : current.homeVisit;
                return {
                  ...current,
                  serviceId,
                  homeVisit,
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

      {selectedService && selectedService.location !== "business" && (
        <div className="grid gap-4 rounded-xl border bg-muted/30 p-3">
          <FormField label="Lugar">
            {(field) => (
              <Select
                value={values.homeVisit ? "home" : "business"}
                disabled={selectedService.location === "home"}
                onValueChange={(place) =>
                  setValues((current) => applyPlace(current, selectedService, place === "home" ? newHomeVisit() : null))
                }
              >
                <SelectTrigger {...field} className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="business">En el local</SelectItem>
                  <SelectItem value="home">A domicilio</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>
          {values.homeVisit && (
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

      <div className="grid gap-4 sm:grid-cols-3">
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

      <div className="grid gap-4 sm:grid-cols-2">
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
              onChange={(e) => set("price", e.target.value)}
            />
          </div>
        )}
      </FormField>
      <FormField label="Estado">
        {(field) => (
          <Select value={values.status} onValueChange={(status) => set("status", status as AppointmentStatus)}>
            <SelectTrigger {...field} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {APPOINTMENT_STATUSES.map((status) => (
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
        <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
        <SubmitButton loading={saveAppointment.isPending} disabled={Boolean(conflict)}>
          {appointment ? "Guardar cambios" : "Crear cita"}
        </SubmitButton>
      </DialogFooter>
    </form>

    {/* Fuera del <form>: los eventos de React atraviesan portales y el submit llegaría al formulario de la cita. */}
    <ClientFormDialog
      open={newClient.open}
      onOpenChange={(open) => setNewClient((current) => ({ ...current, open }))}
      defaultName={newClient.name}
      onSaved={(client) => set("clientId", client.id)}
    />
    </>
  );
}
