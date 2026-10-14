import type { UseQueryResult } from "@tanstack/react-query";
import { Inbox, Mail } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useEmailOutbox } from "@/hooks/queries/use-activity";
import { groupItemsByDay } from "@/features/activity/day-groups";
import type { EmailNotification, EmailType } from "@/types";
import { formatClockTime, formatDateTime, plural } from "@/lib/format";

const TYPE_LABELS: Record<EmailType, string> = {
  welcome: "Bienvenida",
  password_reset: "Contraseña",
  team_invite: "Invitación",
  platform_admin_added: "Alta de super admin",
  booking_created: "Reserva",
  booking_received: "Nueva reserva",
  professional_new_appointment: "Cita nueva (al profesional)",
  professional_daily_agenda: "Agenda del día (al profesional)",
  appointment_copy: "Copia al profesional",
  payment_receipt_received: "Comprobante de pago recibido (al negocio)",
  appointment_confirmed: "Confirmación",
  appointment_updated: "Modificación",
  appointment_cancelled: "Cancelación",
  appointment_reminder: "Recordatorio",
  business_created: "Alta de negocio",
  business_suspended: "Suspensión",
  business_reactivated: "Reactivación",
  plan_change_requested: "Solicitud de plan",
  plan_change_approved: "Plan aprobado",
  plan_changed: "Cambio de plan",
  plan_change_rejected: "Plan rechazado",
};

/** Bandeja de salida del negocio. */
export function EmailOutbox() {
  const timezone = useCurrentBusiness().data?.timezone;
  return <EmailOutboxCard outbox={useEmailOutbox()} timezone={timezone} />;
}

/** Bandeja de salida: los emails que genera el sistema (se envían por Gmail desde la API). */
export function EmailOutboxCard({
  outbox,
  description = "Emails automáticos enviados a tus clientes y a tu equipo: reservas, confirmaciones, cambios y recordatorios.",
  timezone,
  groupByDay,
}: {
  outbox: UseQueryResult<EmailNotification[]>;
  description?: string;
  /** Zona horaria de las fechas (la del negocio; sin ella, la de la plataforma). */
  timezone?: string;
  /** Agrupados por día, con el día como título (panel de plataforma, spec 007). */
  groupByDay?: boolean;
}) {
  const [preview, setPreview] = useState<EmailNotification | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emails enviados</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {outbox.isPending ? (
          <Skeleton className="h-40" />
        ) : outbox.isError ? (
          <ErrorState onRetry={() => outbox.refetch()} />
        ) : outbox.data.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
            <Inbox className="size-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">Todavía no se ha enviado ningún email</p>
            <p className="text-xs text-muted-foreground">Crea o confirma una cita para ver el primero.</p>
          </div>
        ) : groupByDay ? (
          <div className="max-h-[32rem] overflow-y-auto rounded-xl border">
            {groupItemsByDay(outbox.data, (email) => email.createdAt, timezone).map((group) => (
              <section key={group.date} aria-label={group.label}>
                <h3 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b bg-muted px-4 py-2 text-sm font-semibold">
                  {group.label}
                  <span className="text-xs font-normal text-muted-foreground">{plural(group.items.length, "email", "emails")}</span>
                </h3>
                <ul className="divide-y border-b last:border-b-0">
                  {group.items.map((email) => (
                    <li key={email.id}>
                      <EmailRow email={email} when={formatClockTime(email.createdAt, timezone)} onOpen={() => setPreview(email)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="max-h-[28rem] divide-y overflow-y-auto rounded-lg border">
            {outbox.data.map((email) => (
              <li key={email.id}>
                <EmailRow email={email} when={formatDateTime(email.createdAt, timezone)} onOpen={() => setPreview(email)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.subject}</DialogTitle>
            <DialogDescription>
              Para {preview?.to} · {preview && formatDateTime(preview.createdAt, timezone)}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-96 overflow-y-auto rounded-lg bg-muted/60 p-4 font-sans text-sm whitespace-pre-wrap">
            {/* A los 90 días se borra el contenido para no llenar la base; queda el registro. */}
            {preview?.body || "El contenido de los emails se guarda 90 días. De este queda sólo el registro: a quién se envió, el asunto y la fecha."}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EmailRow({ email, when, onOpen }: { email: EmailNotification; when: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 px-4 py-3 text-left outline-none hover:bg-muted focus-visible:bg-muted"
    >
      <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{email.subject}</span>
        <span className="block truncate text-xs text-muted-foreground">
          Para {email.to} · {when}
        </span>
      </span>
      <Badge variant="secondary" className="shrink-0">
        {TYPE_LABELS[email.type]}
      </Badge>
    </button>
  );
}
