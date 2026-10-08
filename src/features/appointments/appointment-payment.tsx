import { CircleCheck, Copy, FileText, Landmark, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { useBusinessId } from "@/features/auth/use-session";
import { meetingUrlPlace, useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { openPaymentReceipt, useAppointmentReceipts, useSetAppointmentPaid } from "@/hooks/queries/use-appointments";
import { useErrorToast } from "@/hooks/use-error-toast";
import { formatDateTime, formatLongDate } from "@/lib/format";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { Appointment, Business, Client, Professional } from "@/types";
import { paymentLinkOf } from "./appointment-utils";

/**
 * Pago de la cita en su ficha: comprobantes que envió el paciente, "Marcar como pagada" y, si la
 * agenda cobra por transferencia, el enlace de pago para mandárselo.
 */
export function AppointmentPayment({
  appointment,
  professional,
  client,
  business,
  serviceName,
}: {
  appointment: Appointment;
  professional: Professional | undefined;
  client: Client | undefined;
  business: Business | null | undefined;
  serviceName: string;
}) {
  const businessId = useBusinessId();
  const receipts = useAppointmentReceipts(appointment);
  const setPaid = useSetAppointmentPaid();
  const showError = useErrorToast();
  const multiAgenda = useMultiAgendaAccess();
  if (appointment.price <= 0 && !appointment.receiptAt && !appointment.paidAt) return null;

  const paid = Boolean(appointment.paidAt);
  const transfers = Boolean(professional?.bankAccount);
  const link = paymentLinkOf(appointment);
  const whatsAppUrl =
    client?.phone && business && transfers && !paid
      ? getWhatsAppUrl(
          client.phone,
          business.timezone,
          `Hola ${client.name.split(" ")[0]}, para pagar por transferencia tu cita de ${serviceName} del ${formatLongDate(appointment.date)} a las ${appointment.startTime}, aquí tienes los datos y puedes enviarnos el comprobante: ${link}`,
        )
      : null;

  const togglePaid = async () => {
    try {
      await setPaid.mutateAsync({ id: appointment.id, paid: !paid });
      toast.success(paid ? "Pago quitado" : "Cita marcada como pagada");
    } catch (error) {
      showError(error);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Enlace de pago copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const open = (receiptId: string) => openPaymentReceipt(businessId, receiptId).catch(showError);

  return (
    <section aria-labelledby="payment-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="payment-heading" className="text-sm font-semibold text-muted-foreground">
          Pago
        </h3>
        {paid ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-highlight/60 px-2 py-0.5 text-xs font-semibold text-ink">
            <CircleCheck className="size-3.5" aria-hidden /> Pagada
          </span>
        ) : appointment.receiptAt ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold">Comprobante por revisar</span>
        ) : (
          <span className="text-xs text-muted-foreground">Sin pagar</span>
        )}
      </div>

      {appointment.receiptAt && (
        <ul className="grid gap-1.5">
          {(receipts.data ?? []).map((receipt) => (
            <li key={receipt.id}>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => open(receipt.id)}>
                <FileText /> Ver comprobante
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {formatDateTime(receipt.createdAt, business?.timezone)}
                </span>
              </Button>
            </li>
          ))}
          {receipts.isPending && <li className="text-xs text-muted-foreground">Cargando comprobantes…</li>}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={paid ? "outline" : "default"} size="sm" disabled={setPaid.isPending} onClick={togglePaid}>
          {paid ? <Undo2 /> : <CircleCheck />} {paid ? "Quitar el pago" : "Marcar como pagada"}
        </Button>
        {transfers && !paid && (
          <>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy /> Copiar enlace de pago
            </Button>
            {whatsAppUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={whatsAppUrl} target="_blank" rel="noreferrer">
                  <WhatsAppIcon /> Enviar datos de pago
                </a>
              </Button>
            )}
          </>
        )}
      </div>
      {!transfers && !paid && appointment.price > 0 && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Landmark className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Para cobrar por transferencia, agrega los datos bancarios en {meetingUrlPlace(multiAgenda)}.
        </p>
      )}
    </section>
  );
}
