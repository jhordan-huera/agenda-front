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
import { data } from "@/lib/data";
import { buildAppointmentNotice, getWhatsAppUrl, type AppointmentNoticeKind } from "@/lib/whatsapp";
import type { Appointment, Business, Client } from "@/types";
import { getServiceName, paymentLinkOf } from "./appointment-utils";
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
 * al pasar a "Confirmada" (con los emails activados en Configuración).
 */
function sendsEmail(notice: PendingNotice, business: Business): boolean {
  const { kind, appointment, previous } = notice;
  if (!notice.client.email) return false;
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

interface PendingNotice {
  appointment: Appointment;
  /** La cita antes del cambio (si se conoce). */
  previous?: Appointment;
  kind: AppointmentNoticeKind;
  client: Client;
  message: string;
}

/**
 * Tras confirmar, cancelar, reprogramar, completar o marcar "No asistió" una cita, propone avisar
 * al cliente por WhatsApp con el mensaje ya escrito (enlace wa.me: lo envía el profesional). Se
 * puede apagar en Configuración → Notificaciones. Al abrir WhatsApp queda en la actividad.
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
    const client = clientsById.get(appointment.clientId);
    if (!client) return;
    if (!client.phone || !getWhatsAppUrl(client.phone, business.timezone, "")) {
      toast.message(`${client.name} no tiene un teléfono válido: no se le puede avisar por WhatsApp.`);
      return;
    }
    const professional = professionals.find((p) => p.id === appointment.professionalId);
    const message = buildAppointmentNotice(kind, {
      clientName: client.name,
      businessName: business.name,
      serviceName: getServiceName(servicesById, appointment.serviceId),
      date: appointment.date,
      startTime: appointment.startTime,
      bookingUrl: `${window.location.origin}/book/${business.slug}`,
      professionalName: professionals.length > 1 ? professional?.displayName : undefined,
      homeVisit: Boolean(appointment.homeVisit),
      virtual: appointment.isVirtual ? { meetingUrl: professional?.meetingUrl || null } : undefined,
      paymentUrl: professional?.bankAccount && appointment.price > 0 && !appointment.paidAt ? paymentLinkOf(appointment) : undefined,
    });
    setNotice({ appointment, previous, kind, client, message });
  };

  const close = () => setNotice(null);
  const url = notice && business ? getWhatsAppUrl(notice.client.phone, business.timezone, notice.message) : null;
  const firstName = notice?.client.name.trim().split(/\s+/)[0] ?? "";

  const opened = () => {
    if (!notice) return;
    // Sólo se sabe que lo abrió (el envío lo hace en WhatsApp); si falla el registro, no molesta.
    data.appointments
      .logWhatsAppNotice(businessId, notice.appointment.id, notice.kind)
      .then(() => invalidateActivity(), () => undefined);
    close();
  };

  return (
    <WhatsAppNoticeContext value={offer}>
      {children}
      <Dialog open={notice !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          {notice && business && (
            <>
              <DialogHeader>
                <DialogTitle>Avísale a {firstName} por WhatsApp</DialogTitle>
                <DialogDescription>
                  {REASONS[notice.kind]}{" "}
                  {sendsEmail(notice, business) && "También le llega un email. "}
                  Revisa el mensaje y envíalo desde WhatsApp.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp-notice-message">Mensaje</Label>
                <Textarea
                  id="whatsapp-notice-message"
                  rows={5}
                  value={notice.message}
                  onChange={(event) => setNotice({ ...notice, message: event.target.value })}
                  data-testid="whatsapp-notice-message"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={close}>
                  Ahora no
                </Button>
                {url && (
                  <Button asChild>
                    <a href={url} target="_blank" rel="noreferrer" onClick={opened}>
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
