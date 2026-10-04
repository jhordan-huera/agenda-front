import {
  CalendarDays,
  Clock,
  ExternalLink,
  FilePlus2,
  Home,
  Mail,
  Navigation,
  Pencil,
  Phone,
  Tag,
  Wallet,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ClinicalNoteDialog } from "@/features/clinical/clinical-note-dialog";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useErrorToast } from "@/hooks/use-error-toast";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { capitalize, formatCurrency, formatDuration, formatLongDate, formatTimeRange } from "@/lib/format";
import { durationInMinutes } from "@/lib/time";
import { describeHomeVisit, getDirectionsUrl } from "@/lib/maps";
import { cn } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { Appointment, AppointmentStatus } from "@/types";
import { getClientName, getServiceName } from "./appointment-utils";

interface AppointmentDetailsSheetProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (appointment: Appointment) => void;
}

export function AppointmentDetailsSheet({ appointmentId, open, onOpenChange, onEdit }: AppointmentDetailsSheetProps) {
  const { data: appointments } = useAppointments();
  const appointment = appointments?.find((a) => a.id === appointmentId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {appointment ? (
          <AppointmentDetails appointment={appointment} onEdit={onEdit} />
        ) : (
          <div className="space-y-4 p-4">
            <SheetTitle className="sr-only">Detalle de la cita</SheetTitle>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
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
  const showError = useErrorToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const clinicalAccess = useClinicalAccess();
  const client = clientsById.get(appointment.clientId);
  const clientName = getClientName(clientsById, appointment.clientId);
  // Mensaje ya escrito con los datos de la cita; el negocio lo revisa antes de enviarlo.
  const whatsAppUrl =
    client?.phone && business
      ? getWhatsAppUrl(
          client.phone,
          business.timezone,
          `Hola ${client.name.split(" ")[0]}, te escribimos de ${business.name} sobre tu cita de ${getServiceName(servicesById, appointment.serviceId)} el ${formatLongDate(appointment.date)} a las ${appointment.startTime}.`,
        )
      : null;

  const changeStatus = async (status: AppointmentStatus) => {
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status });
      toast.success(`Estado actualizado: ${APPOINTMENT_STATUS_CONFIG[status].label}`);
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
        <StatusBadge status={appointment.status} className="mt-2 w-fit" />
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
        </dl>

        {appointment.notes && (
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Notas</p>
            <p className="whitespace-pre-line">{appointment.notes}</p>
          </div>
        )}

        <section aria-labelledby="status-heading" className="space-y-2">
          <h3 id="status-heading" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Cambiar estado
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {APPOINTMENT_STATUSES.filter((s) => s !== "cancelled").map((status) => {
              const active = appointment.status === status;
              return (
                <Button
                  key={status}
                  variant="outline"
                  aria-pressed={active}
                  disabled={active || updateStatus.isPending}
                  onClick={() => changeStatus(status).catch(() => {})}
                  className={cn("justify-start", active && "border-primary bg-accent disabled:opacity-100")}
                >
                  <span className={cn("size-2 rounded-full", APPOINTMENT_STATUS_CONFIG[status].dot)} aria-hidden />
                  {APPOINTMENT_STATUS_CONFIG[status].label}
                </Button>
              );
            })}
          </div>
        </section>

        {client && (
          <>
            <Separator />
            <section aria-labelledby="client-heading" className="space-y-3">
              <h3 id="client-heading" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cliente
              </h3>
              <div className="flex flex-wrap gap-2">
                {whatsAppUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={whatsAppUrl} target="_blank" rel="noreferrer">
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  </Button>
                )}
                {client.phone && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${client.phone}`}>
                      <Phone /> Llamar
                    </a>
                  </Button>
                )}
                {client.email && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${client.email}`}>
                      <Mail /> Email
                    </a>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/dashboard/clients/${client.id}`}>
                    <ExternalLink /> Ver ficha
                  </Link>
                </Button>
              </div>
            </section>
            {clinicalAccess && (
              <section aria-labelledby="clinical-heading" className="space-y-3">
                <h3 id="clinical-heading" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Historia clínica
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
                    <FilePlus2 /> Registrar evolución
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/dashboard/clients/${client.id}?tab=historia`}>
                      <ExternalLink /> Ver historia
                    </Link>
                  </Button>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="mt-auto flex gap-2 border-t p-5">
        <Button variant="outline" className="flex-1" onClick={() => onEdit(appointment)}>
          <Pencil /> Editar
        </Button>
        {appointment.status !== "cancelled" && (
          <Button variant="destructive" className="flex-1" onClick={() => setConfirmCancel(true)}>
            <XCircle /> Cancelar cita
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="¿Cancelar esta cita?"
        description={`La cita de ${clientName} quedará como cancelada y el horario volverá a estar disponible.`}
        confirmLabel="Cancelar cita"
        cancelLabel="Volver"
        destructive
        onConfirm={() => changeStatus("cancelled")}
      />
      {client && clinicalAccess && (
        <ClinicalNoteDialog
          open={noteOpen}
          onOpenChange={setNoteOpen}
          clientId={client.id}
          clientName={client.name}
          appointmentId={appointment.id}
        />
      )}
    </>
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
