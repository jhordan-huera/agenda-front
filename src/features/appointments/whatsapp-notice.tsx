import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBusinessId } from "@/features/auth/use-session";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useInvalidateActivity } from "@/hooks/queries/use-invalidate-activity";
import { useLookups } from "@/hooks/queries/use-lookups";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/lib/constants/business";
import { joinNames } from "@/lib/format";
import { data } from "@/lib/data";
import { buildAppointmentNotice, getWhatsAppUrl, type AppointmentNoticeKind } from "@/lib/whatsapp";
import type { Appointment, Business, Client } from "@/types";
import { appointmentClientIds, getServiceName, paymentLinkOf } from "./appointment-utils";
import { WhatsAppNoticeContext } from "./whatsapp-notice-context";
import { useProfessionals } from "@/hooks/queries/use-professionals";

/** Por qué se propone el aviso, bajo el título. */
const REASONS: Record<AppointmentNoticeKind, string> = {
  confirmed: "La cita quedó confirmada.",
  pending: "La cita cancelada vuelve a estar agendada, pendiente de confirmar.",
  cancelled: "La cita quedó cancelada.",
  rescheduled: "Cambió la fecha, la hora, el profesional o el lugar de la cita.",
  completed: "La cita quedó completada.",
  no_show: "El cliente no asistió.",
};

/** Dónde es la cita, como la compara la API: en el local, virtual o a domicilio (con la dirección). */
const placeOf = (appointment: Appointment) =>
  appointment.isVirtual ? "virtual" : appointment.homeVisit ? `home:${appointment.homeVisit.address}` : "business";

/**
 * ¿Le llega además un email automático? Lo mismo que decide la API al guardar la cita
 * (notifyAppointmentChange): el de cancelación; el de "restablecida" si estaba cancelada; el de
 * cambio si cambió la fecha, la hora, el servicio, el profesional o el lugar; y el de confirmación
 * al pasar a "Confirmada" (con los emails activados en Configuración). A cada paciente, al suyo.
 */
function sendsEmail(notice: PendingNotice, client: Client, business: Business): boolean {
  const { kind, appointment, previous } = notice;
  if (!client.email) return false;
  const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...business.notificationSettings };
  if (kind === "cancelled") return settings.cancellations;
  if (kind === "completed" || kind === "no_show" || !settings.confirmations) return false;
  if (!previous) return kind === "confirmed" || kind === "rescheduled" || kind === "pending";
  if (previous.status === "cancelled") return true;
  const rescheduled =
    previous.date !== appointment.date ||
    previous.startTime !== appointment.startTime ||
    previous.serviceId !== appointment.serviceId ||
    previous.professionalId !== appointment.professionalId ||
    placeOf(previous) !== placeOf(appointment);
  return rescheduled || (appointment.status === "confirmed" && previous.status !== "confirmed");
}

/** Un paciente de la cita con teléfono válido y su mensaje (que el profesional puede retocar). */
interface NoticeRecipient {
  client: Client;
  message: string;
  /** Ya abrió WhatsApp con su mensaje. */
  opened: boolean;
}

interface PendingNotice {
  appointment: Appointment;
  /** La cita antes del cambio (si se conoce). */
  previous?: Appointment;
  kind: AppointmentNoticeKind;
  /** Uno por paciente con teléfono (en una sesión de pareja, los dos). */
  recipients: NoticeRecipient[];
}

const firstNameOf = (client: Client) => client.name.trim().split(/\s+/)[0] ?? "";

/**
 * Tras confirmar, cancelar, reprogramar, completar o marcar "No asistió" una cita, propone avisar
 * al cliente por WhatsApp con el mensaje ya escrito (enlace wa.me: lo envía el profesional); con varios
 * pacientes, un mensaje y un botón para cada uno. Se puede apagar en Configuración → Notificaciones. Al
 * abrir WhatsApp queda en la actividad.
 */
export function WhatsAppNoticeProvider({ children }: { children: ReactNode }) {
  const businessId = useBusinessId();
  const { data: business } = useCurrentBusiness();
  const { clientsById, servicesById } = useLookups();
  const { data: professionals = [] } = useProfessionals();
  const invalidateActivity = useInvalidateActivity();
  const [notice, setNotice] = useState<PendingNotice | null>(null);

  const offer = (appointment: Appointment, kind: AppointmentNoticeKind | null, previous?: Appointment) => {
    if (!kind || !business) return;
    const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...business.notificationSettings };
    const followUp = kind === "completed" || kind === "no_show";
    if (!(followUp ? settings.whatsappFollowUps : settings.whatsappOnStatusChange)) return;
    const patients = appointmentClientIds(appointment).flatMap((id) => clientsById.get(id) ?? []);
    if (patients.length === 0) return;
    const reachable = patients.filter((client) => client.phone && getWhatsAppUrl(client.phone, business.timezone, ""));
    const unreachable = patients.filter((client) => !reachable.includes(client));
    if (unreachable.length > 0) {
      const names = joinNames(unreachable.map((client) => client.name));
      toast.message(
        unreachable.length === 1
          ? `${names} no tiene un teléfono válido: no se le puede avisar por WhatsApp.`
          : `${names} no tienen un teléfono válido: no se les puede avisar por WhatsApp.`,
      );
    }
    if (reachable.length === 0) return;
    const professional = professionals.find((p) => p.id === appointment.professionalId);
    const messageFor = (client: Client) =>
      buildAppointmentNotice(kind, {
        clientName: client.name,
        businessName: business.name,
        serviceName: getServiceName(servicesById, appointment.serviceId),
        date: appointment.date,
        startTime: appointment.startTime,
        bookingUrl: `${window.location.origin}/book/${business.slug}`,
        professionalName: professionals.length > 1 ? professional?.displayName : undefined,
        homeVisit: Boolean(appointment.homeVisit),
        virtual: appointment.isVirtual ? { meetingUrl: professional?.meetingUrl || null } : undefined,
        paymentUrl:
          professional?.bankAccounts.length && appointment.price > 0 && !appointment.paidAt ? paymentLinkOf(appointment) : undefined,
      });
    setNotice({
      appointment,
      previous,
      kind,
      recipients: reachable.map((client) => ({ client, message: messageFor(client), opened: false })),
    });
  };

  const close = () => setNotice(null);
  const several = (notice?.recipients.length ?? 0) > 1;

  const updateRecipient = (index: number, patch: Partial<NoticeRecipient>) =>
    setNotice((current) =>
      current ? { ...current, recipients: current.recipients.map((r, i) => (i === index ? { ...r, ...patch } : r)) } : current,
    );

  const opened = (index: number) => {
    if (!notice) return;
    const { client } = notice.recipients[index];
    // Sólo se sabe que lo abrió (el envío lo hace en WhatsApp); si falla el registro, no molesta.
    data.appointments
      .logWhatsAppNotice(businessId, notice.appointment.id, notice.kind, client.id)
      .then(() => invalidateActivity(), () => undefined);
    // Con un solo paciente se cierra; con varios, queda abierto para avisar a los demás.
    if (!several || notice.recipients.every((r, i) => i === index || r.opened)) close();
    else updateRecipient(index, { opened: true });
  };

  return (
    <WhatsAppNoticeContext value={offer}>
      {children}
      <Dialog open={notice !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          {notice && business && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {several ? "Avísales por WhatsApp" : `Avísale a ${firstNameOf(notice.recipients[0].client)} por WhatsApp`}
                </DialogTitle>
                <DialogDescription>
                  {REASONS[notice.kind]}{" "}
                  {!several && sendsEmail(notice, notice.recipients[0].client, business) && "También le llega un email. "}
                  {several ? "Revisa el mensaje de cada uno y envíalo desde WhatsApp." : "Revisa el mensaje y envíalo desde WhatsApp."}
                </DialogDescription>
              </DialogHeader>
              {notice.recipients.map((recipient, index) => {
                const url = getWhatsAppUrl(recipient.client.phone, business.timezone, recipient.message);
                const fieldId = `whatsapp-notice-message-${index}`;
                return (
                  <div key={recipient.client.id} className={several ? "grid gap-2 rounded-lg border p-3" : "grid gap-2"}>
                    <Label htmlFor={fieldId}>{several ? `Mensaje para ${recipient.client.name}` : "Mensaje"}</Label>
                    <Textarea
                      id={fieldId}
                      rows={5}
                      value={recipient.message}
                      onChange={(event) => updateRecipient(index, { message: event.target.value })}
                      data-testid="whatsapp-notice-message"
                    />
                    {several && (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {sendsEmail(notice, recipient.client, business) ? "También le llega un email." : ""}
                        </span>
                        {url && (
                          <Button asChild size="sm" variant={recipient.opened ? "outline" : "default"}>
                            <a href={url} target="_blank" rel="noreferrer" onClick={() => opened(index)}>
                              <WhatsAppIcon /> {recipient.opened ? "Abrir de nuevo" : `Abrir WhatsApp de ${firstNameOf(recipient.client)}`}
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  {several && notice.recipients.some((r) => r.opened) ? "Listo" : "Ahora no"}
                </Button>
                {!several && (
                  <Button asChild>
                    <a
                      href={getWhatsAppUrl(notice.recipients[0].client.phone, business.timezone, notice.recipients[0].message) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => opened(0)}
                    >
                      <WhatsAppIcon /> Abrir WhatsApp
                    </a>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </WhatsAppNoticeContext>
  );
}
