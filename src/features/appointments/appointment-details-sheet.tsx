import {
  CalendarDays,
  Clock,
  DoorOpen,
  Stethoscope,
  Undo2,
  ExternalLink,
  FilePlus2,
  Home,
  Mail,
  Navigation,
  ListX,
  Lock,
  Pencil,
  PencilLine,
  Phone,
  Repeat,
  Tag,
  UserCheck,
  Video,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VerifyBadge } from "@/components/shared/verify-badge";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { ClinicalNoteDialog } from "@/features/clinical/clinical-note-dialog";
import { useClinicalAccess, useClinicalSupportBlocked } from "@/features/clinical/use-clinical-access";
import { ProfessionalDot } from "@/features/professionals/professional-select";
import { meetingUrlPlace, useAgendas, useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import {
  useAppointment,
  useCancelFollowingAppointments,
  useSetAppointmentArrival,
  useUpdateAppointmentStatus,
} from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useErrorToast } from "@/hooks/use-error-toast";
import { seriesFrequencyText } from "@/lib/appointment-series";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_CONFIG,
  LOCKED_STATUS,
  canChangeStatus,
  statusChangeError,
} from "@/lib/constants/appointment-status";
import {
  capitalize,
  formatClockTime,
  formatCurrency,
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatTimeRange,
} from "@/lib/format";
import { durationInMinutes } from "@/lib/time";
import { describeHomeVisit, getDirectionsUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { Appointment, AppointmentStatus, Client } from "@/types";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { AppointmentCorrectionDialog } from "./appointment-correction-dialog";
import { AppointmentPayment } from "./appointment-payment";
import {
  appointmentClientIds,
  clientConfirmationSummary,
  clientConfirmedAt,
  clientsToVerify,
  getAppointmentClientNames,
  getServiceName,
  seriesDayLabel,
} from "./appointment-utils";
import { ClaimReview } from "./claim-review";

interface AppointmentDetailsSheetProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: Appointment) => void;
}

export function AppointmentDetailsSheet({ appointmentId, open, onOpenChange, onEdit }: AppointmentDetailsSheetProps) {
  // Sólo esa cita: sale de la agenda ya cargada o se pide sola, sin descargar todas.
  const query = useAppointment(appointmentId);
  const appointment = query.data;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {appointment ? (
          <AppointmentDetails key={appointment.id} appointment={appointment} onEdit={onEdit} />
        ) : (
          <div className="space-y-4 p-4 pr-12">
            <SheetTitle className={appointment === null ? undefined : "sr-only"}>
              {appointment === null ? "Cita no encontrada" : "Detalle de la cita"}
            </SheetTitle>
            {appointment === null ? (
              // Se eliminó (o el enlace es de otra agenda): la API responde sin cita.
              <SheetDescription>Puede que se haya eliminado o que no sea de tu agenda.</SheetDescription>
            ) : query.isError || query.isPaused ? (
              <ErrorState
                description={query.isPaused ? "No tienes conexión. Revísala e inténtalo de nuevo." : undefined}
                onRetry={() => query.refetch()}
              />
            ) : (
              <>
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-40 w-full" />
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AppointmentDetails({
  appointment,
  onEdit,
}: {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
}) {
  const { clientsById, servicesById } = useLookups();
  const { data: business } = useCurrentBusiness();
  const updateStatus = useUpdateAppointmentStatus();
  const setArrival = useSetAppointmentArrival();
  const cancelFollowing = useCancelFollowingAppointments();
  const showError = useErrorToast();
  const agendas = useAgendas();
  const multiAgenda = useMultiAgendaAccess();
  const professional = agendas.byId(appointment.professionalId);
  // La llegada se marca en citas que aún no se atendieron.
  const canMarkArrival = appointment.status === "pending" || appointment.status === "confirmed";
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Una cita completada queda fija (spec 020): sin los botones de estado ni «Cancelar cita». Sólo el
  // propietario (también el super admin en modo soporte, que entra como propietario) la corrige, con un motivo.
  const { session } = useSession();
  const locked = appointment.status === LOCKED_STATUS;
  const canCorrect = locked && session?.role === "owner";
  const [correcting, setCorrecting] = useState(false);
  // Ninguna cita vuelve a Pendiente: el botón va deshabilitado, con su ayuda.
  const pendingHint = appointment.status === "pending" ? null : statusChangeError(appointment.status, "pending");
  // Una cita de una serie (spec 011): «Cita 3 de 8» y, si sigue activa y no es la última, «Cancelar ésta y
  // las siguientes» (la API sólo cancela las que siguen pendientes o confirmadas).
  const series = appointment.series ?? null;
  const showSeries = series !== null && series.total >= 2;
  const canCancelFollowing =
    showSeries && series.index < series.total && (appointment.status === "pending" || appointment.status === "confirmed");
  const [confirmCancelFollowing, setConfirmCancelFollowing] = useState(false);
  // Avisar al paciente del cambio de estado (spec 008). Siempre marcada al abrir la ficha: se desmarca
  // sólo para corregir un error, y no se recuerda para que nunca quede apagada por olvido.
  const [notify, setNotify] = useState(true);
  // Para qué paciente se registra la evolución (con varios pacientes, cada uno tiene la suya).
  const [noteFor, setNoteFor] = useState<Client | null>(null);
  const clinicalAccess = useClinicalAccess();
  // En modo soporte, una línea en lugar de «Registrar evolución» y «Ver historia» (spec 025).
  const clinicalSupportBlocked = useClinicalSupportBlocked();
  // El paciente principal (el del pago) y, en una sesión de pareja o de familia, los demás.
  const client = clientsById.get(appointment.clientId);
  const patients = appointmentClientIds(appointment).flatMap((id) => clientsById.get(id) ?? []);
  const clientName = getAppointmentClientNames(clientsById, appointment);
  // Reserva «Por verificar» (spec 009): algún paciente escribió la cédula de otra ficha con otros datos.
  const toVerify = clientsToVerify(clientsById, appointment).length > 0;
  // «Confirmo que voy» desde el email (spec 010): con una persona, cuándo; con varias, el resumen arriba
  // y bajo cada una si ya confirmó.
  const confirmation = clientConfirmationSummary(appointment);
  const mainConfirmedAt = clientConfirmedAt(appointment, appointment.clientId);
  const showEachConfirmation =
    patients.length > 1 && (appointment.status === "pending" || appointment.status === "confirmed" || confirmation !== null);
  const confirmationOf = (patient: Client) => {
    if (!showEachConfirmation) return undefined;
    const at = clientConfirmedAt(appointment, patient.id);
    return at
      ? { confirmed: true, text: `Confirmó que va el ${formatDayMonth(at, business?.timezone)} a las ${formatClockTime(at, business?.timezone)}` }
      : { confirmed: false, text: "Aún no confirma" };
  };
  // Mensaje ya escrito con los datos de la cita; el negocio lo revisa antes de enviarlo.
  const whatsAppUrlOf = (patient: Client) =>
    patient.phone && business
      ? getWhatsAppUrl(
          patient.phone,
          business.timezone,
          `Hola ${patient.name.split(" ")[0]}, te escribimos de ${business.name} sobre tu cita de ${getServiceName(servicesById, appointment.serviceId)} el ${formatLongDate(appointment.date)} a las ${appointment.startTime}.`,
        )
      : null;

  const toggleArrival = async () => {
    const arrived = !appointment.arrivedAt;
    try {
      await setArrival.mutateAsync({ id: appointment.id, arrived });
      toast.success(arrived ? `${clientName} llegó` : "Llegada quitada");
    } catch (error) {
      showError(error);
    }
  };

  const cancelThisAndFollowing = async () => {
    try {
      const { cancelled } = await cancelFollowing.mutateAsync({ id: appointment.id, notify });
      toast.success(cancelled.length === 1 ? "Se canceló 1 cita" : `Se cancelaron ${cancelled.length} citas`, {
        description: notify ? undefined : "Sin avisar al paciente.",
      });
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const changeStatus = async (status: AppointmentStatus) => {
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status, notify });
      toast.success(`Estado actualizado: ${APPOINTMENT_STATUS_CONFIG[status].label}`, {
        description: notify ? undefined : "Sin avisar al paciente.",
      });
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  return (
    <>
      <SheetHeader className="border-b p-5 pr-12">
        <div className="flex items-center gap-3">
          <UserAvatar name={clientName} size="lg" />
          <div className="min-w-0">
            <SheetTitle className="truncate text-base">{clientName}</SheetTitle>
            <SheetDescription>{getServiceName(servicesById, appointment.serviceId)}</SheetDescription>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} className="w-fit" />
          {appointment.arrivedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-highlight/60 px-2 py-0.5 text-xs font-semibold text-ink">
              <DoorOpen className="size-3.5" aria-hidden /> Llegó a las {formatClockTime(appointment.arrivedAt, business?.timezone)}
            </span>
          )}
          {confirmation && (
            <span className="inline-flex items-center gap-1 rounded-full bg-highlight/60 px-2 py-0.5 text-xs font-semibold text-ink">
              <UserCheck className="size-3.5" aria-hidden />
              {confirmation.total === 1 && mainConfirmedAt
                ? `${confirmation.label} · ${formatDayMonth(mainConfirmedAt, business?.timezone)}, ${formatClockTime(mainConfirmedAt, business?.timezone)}`
                : confirmation.label}
            </span>
          )}
          {toVerify && <VerifyBadge />}
        </div>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <dl className="grid gap-3 text-sm">
          <DetailRow icon={CalendarDays} label="Fecha">
            {capitalize(formatLongDate(appointment.date))}
          </DetailRow>
          <DetailRow icon={Clock} label="Hora">
            {formatTimeRange(appointment.startTime, appointment.endTime)} ·{" "}
            {formatDuration(durationInMinutes(appointment.startTime, appointment.endTime))}
          </DetailRow>
          {showSeries && (
            <DetailRow icon={Repeat} label="Serie">
              Cita {series.index} de {series.total} · {seriesFrequencyText(series.frequency)}
            </DetailRow>
          )}
          {(agendas.multiple || (professional && agendas.all.length > 1)) && professional && (
            <DetailRow icon={Stethoscope} label="Profesional">
              <span className="inline-flex items-center gap-2">
                <ProfessionalDot color={professional.color} />
                {professional.displayName}
                {!professional.isActive && <span className="text-muted-foreground">(inactivo)</span>}
              </span>
            </DetailRow>
          )}
          <DetailRow icon={Wallet} label="Precio">
            {formatCurrency(appointment.price)}
          </DetailRow>
          <DetailRow icon={Tag} label="Origen">
            {appointment.source === "booking_page" ? "Reserva online" : "Creada desde el panel"}
          </DetailRow>
          {appointment.homeVisit && (
            <DetailRow icon={Home} label="Lugar">
              <span className="font-medium">A domicilio</span>
              <span className="block text-muted-foreground">{describeHomeVisit(appointment.homeVisit)}</span>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <a href={getDirectionsUrl(appointment.homeVisit)} target="_blank" rel="noreferrer">
                  <Navigation /> Cómo llegar
                </a>
              </Button>
              {appointment.homeVisit.lat === null && (
                <span className="mt-1 block text-xs text-muted-foreground">Sin punto en el mapa: se busca por la dirección.</span>
              )}
            </DetailRow>
          )}
          {appointment.isVirtual && (
            <DetailRow icon={Video} label="Lugar">
              <span className="block font-medium">Virtual (videollamada)</span>
              {professional?.meetingUrl ? (
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <a href={professional.meetingUrl} target="_blank" rel="noreferrer">
                    <Video /> Entrar a la videollamada
                  </a>
                </Button>
              ) : (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Sin enlace: agrégalo en {meetingUrlPlace(multiAgenda)} para que llegue en la confirmación.
                </span>
              )}
            </DetailRow>
          )}
        </dl>

        {appointment.notes && (
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notas</p>
            <p className="whitespace-pre-line">{appointment.notes}</p>
          </div>
        )}

        {(canMarkArrival || appointment.arrivedAt) && (
          <Button
            variant={appointment.arrivedAt ? "outline" : "default"}
            className="w-full"
            disabled={setArrival.isPending || (!canMarkArrival && Boolean(appointment.arrivedAt))}
            onClick={toggleArrival}
          >
            {appointment.arrivedAt ? (
              <>
                <Undo2 /> Quitar la llegada
              </>
            ) : (
              <>
                <DoorOpen /> Marcar que llegó
              </>
            )}
          </Button>
        )}

        <AppointmentPayment
          appointment={appointment}
          professional={professional}
          client={client}
          business={business}
          serviceName={getServiceName(servicesById, appointment.serviceId)}
        />

        <section aria-labelledby="status-heading" className="space-y-2">
          <h3 id="status-heading" className="text-sm font-semibold text-muted-foreground">
            {locked ? "Estado" : "Cambiar estado"}
          </h3>
          {locked ? (
            <div className="grid gap-3 rounded-lg border bg-muted/40 p-3">
              <div className="grid gap-0.5">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  Completada · ya no se puede cambiar
                </p>
                <p className="text-xs text-muted-foreground">
                  {canCorrect
                    ? "Si es un error, corrígela con un motivo: queda en la actividad."
                    : "Si es un error, el propietario puede corregirla con un motivo."}
                </p>
              </div>
              {canCorrect && (
                <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setCorrecting(true)}>
                  <PencilLine /> Corregir estado
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {APPOINTMENT_STATUSES.filter((s) => s !== "cancelled").map((status) => {
                  const active = appointment.status === status;
                  const blocked = !active && !canChangeStatus(appointment.status, status);
                  return (
                    <Button
                      key={status}
                      variant="outline"
                      aria-pressed={active}
                      disabled={active || blocked || updateStatus.isPending}
                      aria-describedby={blocked && pendingHint ? "pending-hint" : undefined}
                      title={blocked ? (statusChangeError(appointment.status, status) ?? undefined) : undefined}
                      onClick={() => changeStatus(status).catch(() => {})}
                      // El estado actual, marcado: en el oscuro también hay que pisar el fondo y el borde del botón outline.
                      className={cn("justify-start", active && "border-primary bg-accent disabled:opacity-100 dark:border-primary dark:bg-accent")}
                    >
                      <span className={cn("size-2 shrink-0 rounded-full", APPOINTMENT_STATUS_CONFIG[status].dot)} aria-hidden />
                      {APPOINTMENT_STATUS_CONFIG[status].label}
                    </Button>
                  );
                })}
              </div>
              {pendingHint && (
                <p id="pending-hint" className="text-xs text-muted-foreground">
                  {pendingHint}
                </p>
              )}
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="notify-patient"
                  checked={notify}
                  onCheckedChange={(checked) => setNotify(checked === true)}
                  aria-describedby="notify-patient-hint"
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <Label htmlFor="notify-patient" className="font-normal">
                    Avisar al paciente por email y WhatsApp
                  </Label>
                  <p id="notify-patient-hint" className="text-xs text-muted-foreground">
                    Desmárcala si sólo corriges un error. También vale para «Cancelar cita»
                    {canCancelFollowing ? " y «Cancelar ésta y las siguientes»" : ""}.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

        {patients.length > 0 && (
          <>
            <Separator />
            <section aria-labelledby="client-heading" className="space-y-3">
              <h3 id="client-heading" className="text-sm font-semibold text-muted-foreground">
                {patients.length > 1 ? "Pacientes" : "Cliente"}
              </h3>
              {patients.map((patient) => (
                <div key={patient.id} className="space-y-2">
                  <PatientContact
                    patient={patient}
                    showName={patients.length > 1}
                    confirmation={confirmationOf(patient)}
                    whatsAppUrl={whatsAppUrlOf(patient)}
                    clinicalAccess={clinicalAccess}
                    clinicalSupportBlocked={clinicalSupportBlocked}
                    onNote={() => setNoteFor(patient)}
                  />
                  <ClaimReview patient={patient} />
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t p-5">
        <Button variant="outline" className="flex-1" onClick={() => onEdit(appointment)}>
          <Pencil /> Editar
        </Button>
        {appointment.status !== "cancelled" && !locked && (
          <Button variant="destructive" className="flex-1" onClick={() => setConfirmCancel(true)}>
            <XCircle /> Cancelar cita
          </Button>
        )}
        {canCancelFollowing && (
          <Button
            variant="outline"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40"
            onClick={() => setConfirmCancelFollowing(true)}
          >
            <ListX /> Cancelar ésta y las siguientes
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="¿Cancelar esta cita?"
        description={`La cita de ${clientName} quedará como cancelada y el horario volverá a estar disponible.${notify ? "" : " No se avisará al paciente."}`}
        confirmLabel="Cancelar cita"
        cancelLabel="Volver"
        destructive
        onConfirm={() => changeStatus("cancelled")}
      />
      {canCancelFollowing && (
        <ConfirmDialog
          open={confirmCancelFollowing}
          onOpenChange={setConfirmCancelFollowing}
          title="¿Cancelar esta cita y las siguientes de la serie?"
          description={`Se cancelarán las que sigan activas desde el ${seriesDayLabel(appointment.date).toLowerCase()} (cita ${series.index} de ${series.total} en adelante). Las atendidas no cambian.${notify ? "" : " No se avisará al paciente."}`}
          confirmLabel="Cancelar ésta y las siguientes"
          cancelLabel="Volver"
          destructive
          onConfirm={cancelThisAndFollowing}
        />
      )}
      {canCorrect && (
        <AppointmentCorrectionDialog
          appointment={appointment}
          clientName={clientName}
          timezone={business?.timezone ?? DEFAULT_TIMEZONE}
          open={correcting}
          onOpenChange={setCorrecting}
        />
      )}
      {noteFor && clinicalAccess && (
        <ClinicalNoteDialog
          open
          onOpenChange={(open) => !open && setNoteFor(null)}
          clientId={noteFor.id}
          clientName={noteFor.name}
          appointmentId={appointment.id}
        />
      )}
    </>
  );
}

/**
 * Contacto, ficha e historia de un paciente de la cita. Una reserva online de alguien que ya estaba en el
 * negocio queda restringida hasta que el negocio la gestione (ver Client.restricted).
 */
function PatientContact({
  patient,
  showName,
  confirmation,
  whatsAppUrl,
  clinicalAccess,
  clinicalSupportBlocked,
  onNote,
}: {
  patient: Client;
  /** Con varios pacientes, el nombre de cada uno sobre sus botones. */
  showName: boolean;
  /** Con varios pacientes: si confirmó que va desde su email (spec 010) o «Aún no confirma». */
  confirmation?: { confirmed: boolean; text: string };
  whatsAppUrl: string | null;
  clinicalAccess: boolean;
  /** Modo soporte con la historia activada: la línea del candado en lugar de los botones (spec 025). */
  clinicalSupportBlocked: boolean;
  onNote: () => void;
}) {
  const confirmationLine = confirmation && (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {confirmation.confirmed && <UserCheck className="size-3.5 shrink-0 text-ink" aria-hidden />}
      {confirmation.text}
    </p>
  );
  if (patient.restricted) {
    return (
      <div className="space-y-1.5">
        {showName && <p className="text-sm font-semibold">{patient.name}</p>}
        {confirmationLine}
        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          Es una reserva online de un paciente que ya estaba en el negocio. Podrás abrir su ficha y su historia cuando
          recepción, un administrador o el propietario confirme o gestione la cita.
        </p>
      </div>
    );
  }
  return (
    <div className={cn("space-y-2", showName && "rounded-lg border p-3")}>
      {showName && <p className="text-sm font-semibold">{patient.name}</p>}
      {confirmationLine}
      <div className="flex flex-wrap gap-2">
        {whatsAppUrl && (
          <Button asChild variant="outline" size="sm">
            <a href={whatsAppUrl} target="_blank" rel="noreferrer" aria-label={`Escribir a ${patient.name} por WhatsApp`}>
              <WhatsAppIcon /> WhatsApp
            </a>
          </Button>
        )}
        {patient.phone && (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${patient.phone}`} aria-label={`Llamar a ${patient.name}`}>
              <Phone /> Llamar
            </a>
          </Button>
        )}
        {patient.email && (
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${patient.email}`} aria-label={`Escribir un email a ${patient.name}`}>
              <Mail /> Email
            </a>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to={`/dashboard/clients/${patient.id}`} aria-label={`Ver la ficha de ${patient.name}`}>
            <ExternalLink /> Ver ficha
          </Link>
        </Button>
      </div>
      {clinicalAccess && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onNote} aria-label={`Registrar evolución de ${patient.name}`}>
            <FilePlus2 /> Registrar evolución
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/dashboard/clients/${patient.id}?tab=historia`} aria-label={`Ver la historia clínica de ${patient.name}`}>
              <ExternalLink /> Ver historia
            </Link>
          </Button>
        </div>
      )}
      {clinicalSupportBlocked && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          La historia clínica no se ve en modo soporte
        </p>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
