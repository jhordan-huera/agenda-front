import { CircleCheck, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceName } from "@/features/appointments/appointment-utils";
import { usePermissions } from "@/features/auth/use-permissions";
import { useMultiAgendaAccess } from "@/features/professionals/use-agendas";
import { usePayPendingPayments, useSetAppointmentPaid } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useProfessionals } from "@/hooks/queries/use-professionals";
import { getErrorMessage } from "@/lib/data";
import { capitalize, formatCurrency, formatDate } from "@/lib/format";
import { pendingPaymentsOf, pendingTotal } from "@/lib/pending-payments";
import { buildPendingPaymentsMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import type { Appointment, Business, Client } from "@/types";

const sessionsLabel = (count: number) => `${count} ${count === 1 ? "sesión" : "sesiones"}`;

/**
 * «Por cobrar» en la ficha del paciente (spec 046): sus sesiones atendidas sin marcar como pagadas, de la más
 * antigua a la más reciente, con el total. Cada una se marca sola o todas de una vez (con confirmación), y
 * «Recordar el pago por WhatsApp» abre un mensaje amable ya escrito. Sólo sale si debe algo; las citas son las
 * que ya cargó la ficha (el rol Profesional, sólo las de su agenda).
 */
export function PendingPaymentsCard({
  client,
  business,
  appointments,
  onOpen,
}: {
  client: Client;
  business: Business | null | undefined;
  appointments: Appointment[];
  onOpen: (appointment: Appointment) => void;
}) {
  const { servicesById } = useLookups();
  const professionals = useProfessionals();
  const multiAgenda = useMultiAgendaAccess();
  const { can } = usePermissions();
  const setPaid = useSetAppointmentPaid();
  const payAll = usePayPendingPayments();
  const [confirming, setConfirming] = useState(false);

  const sessions = pendingPaymentsOf(appointments, client.id);
  if (sessions.length === 0) return null;

  const currency = business?.currency;
  const total = pendingTotal(sessions);
  const canPay = can("appointments.manage");
  const professionalsById = new Map((professionals.data ?? []).map((professional) => [professional.id, professional]));
  const whatsAppUrl =
    client.phone && business
      ? getWhatsAppUrl(
          client.phone,
          business.timezone,
          buildPendingPaymentsMessage({
            clientName: client.name,
            businessName: business.name,
            sessions: sessions.map((session) => ({
              date: session.date,
              serviceName: getServiceName(servicesById, session.serviceId),
            })),
            total,
            currency,
            accounts: sessions.flatMap((session) => professionalsById.get(session.professionalId)?.bankAccounts ?? []),
          }),
        )
      : null;

  const markOne = async (appointment: Appointment) => {
    try {
      await setPaid.mutateAsync({ id: appointment.id, paid: true });
      toast.success("Sesión marcada como pagada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card aria-labelledby="pending-payments-title">
      <CardHeader>
        <CardTitle id="pending-payments-title">Por cobrar</CardTitle>
        <CardDescription>Sesiones atendidas que todavía no se marcan como pagadas.</CardDescription>
        <CardAction className="text-right">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatCurrency(total, currency)}</p>
          <p className="text-xs text-muted-foreground">{sessionsLabel(sessions.length)}</p>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {sessions.map((session) => {
            const professional = multiAgenda ? professionalsById.get(session.professionalId)?.displayName : undefined;
            const service = getServiceName(servicesById, session.serviceId);
            return (
              <li key={session.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onOpen(session)}
                  className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="block truncate text-sm font-medium">
                    {capitalize(formatDate(session.date, "EEE d 'de' MMM"))} · {service}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    {professional && <span className="truncate">{professional}</span>}
                    {session.receiptAt && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-medium text-ink">
                        <Receipt className="size-3" aria-hidden /> Comprobante por revisar
                      </span>
                    )}
                  </span>
                </button>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(session.price, currency)}</span>
                {canPay && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    aria-label={`Marcar como pagada la sesión del ${formatDate(session.date, "d 'de' MMMM")}`}
                    title="Marcar como pagada"
                    disabled={setPaid.isPending && setPaid.variables?.id === session.id}
                    onClick={() => markOne(session)}
                  >
                    <CircleCheck />
                    <span className="hidden sm:inline">Marcar como pagada</span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {(canPay || whatsAppUrl) && (
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
            {canPay && (
              <Button onClick={() => setConfirming(true)}>
                <CircleCheck /> Marcar todas como pagadas
              </Button>
            )}
            {whatsAppUrl && (
              <Button asChild variant="outline">
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon /> Recordar el pago por WhatsApp
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Marcar ${sessions.length === 1 ? "la sesión" : `las ${sessions.length} sesiones`} como ${sessions.length === 1 ? "pagada" : "pagadas"}?`}
        description={`Total: ${formatCurrency(total, currency)}. Cada una queda en la actividad, como al marcarla en su cita.`}
        confirmLabel={sessions.length === 1 ? "Marcar como pagada" : "Marcar todas como pagadas"}
        onConfirm={async () => {
          try {
            const { paid } = await payAll.mutateAsync({ clientId: client.id, appointmentIds: sessions.map((session) => session.id) });
            toast.success(paid === 1 ? "1 sesión marcada como pagada" : `${paid} sesiones marcadas como pagadas`);
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </Card>
  );
}
