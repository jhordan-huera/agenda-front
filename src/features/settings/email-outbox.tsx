import type { UseQueryResult } from "@tanstack/react-query";
import { Inbox, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useEmailOutbox } from "@/hooks/queries/use-activity";
import { groupItemsByDay } from "@/features/activity/day-groups";
import type { EmailNotification } from "@/types";
import { EMAIL_TYPE_LABELS as TYPE_LABELS } from "./email-type-labels";
import { formatClockTime, formatDateTime, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/** El estado de cada email: si salió, si espera en la cola o si falló (o se descartó a propósito). */
function deliveryOf(email: EmailNotification): { label: string; variant: "outline" | "destructive" } {
  if (email.status === "sent") return { label: "Enviado", variant: "outline" };
  if (email.status === "queued") return { label: "En cola", variant: "outline" };
  return email.discarded ? { label: "Descartado", variant: "outline" } : { label: "Falló", variant: "destructive" };
}

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
  id,
  toolbar,
  empty,
}: {
  outbox: UseQueryResult<EmailNotification[]>;
  description?: string;
  /** El ancla de la tarjeta («Ver emails» del Inicio del super admin lleva a /admin/activity#emails). */
  id?: string;
  /** Los filtros, encima de la lista (los del super admin: Hoy, Fallidos, Todos). */
  toolbar?: ReactNode;
  /** El texto sin emails, si no es el de siempre (p. ej. con un filtro). */
  empty?: { title: string; detail: string };
  /** Zona horaria de las fechas (la del negocio; sin ella, la de la plataforma). */
  timezone?: string;
  /** Agrupados por día, con el día como título (panel de plataforma, spec 007). */
  groupByDay?: boolean;
}) {
  const [preview, setPreview] = useState<EmailNotification | null>(null);

  return (
    <Card id={id} className={cn(id && "scroll-mt-20")}>
      <CardHeader>
        <CardTitle>Emails enviados</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {toolbar && <div className="mb-3">{toolbar}</div>}
        {outbox.isPending ? (
          <Skeleton className="h-40" />
        ) : outbox.isError ? (
          <ErrorState onRetry={() => outbox.refetch()} />
        ) : outbox.data.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
            <Inbox className="size-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{empty?.title ?? "Todavía no se ha enviado ningún email"}</p>
            <p className="text-xs text-muted-foreground">{empty?.detail ?? "Crea o confirma una cita para ver el primero."}</p>
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

      <EmailPreviewDialog email={preview} timezone={timezone} onClose={() => setPreview(null)} />
    </Card>
  );
}

/** El contenido de un email al tocarlo en la lista (también la de /admin → Actividad, spec 049). */
export function EmailPreviewDialog({
  email,
  timezone,
  onClose,
}: {
  email: EmailNotification | null;
  timezone?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(email)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{email?.subject}</DialogTitle>
          <DialogDescription>
            Para {email?.to} · {email && formatDateTime(email.createdAt, timezone)}
            {email?.businessName && ` · ${email.businessName}`}
          </DialogDescription>
        </DialogHeader>
        {email && <DeliveryDetail email={email} timezone={timezone} />}
        <pre className="max-h-96 overflow-y-auto rounded-lg bg-muted/60 p-4 font-sans text-sm whitespace-pre-wrap">
          {/* Cada lunes al mediodía se borra el contenido para no llenar la base; queda el registro. */}
          {email?.body || "El contenido de los emails se borra cada lunes al mediodía. De este queda sólo el registro: a quién se envió, el asunto y la fecha."}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

/**
 * En la vista previa: si salió, cuándo; si falló, el motivo (el de Gmail o el del sistema). Sólo lo trae la
 * bandeja del super admin; la del negocio no lleva este detalle.
 */
function DeliveryDetail({ email, timezone }: { email: EmailNotification; timezone?: string }) {
  if (email.sentAt === undefined && email.error === undefined) return null;
  const delivery = deliveryOf(email);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <Badge variant={delivery.variant}>{delivery.label}</Badge>
      <span className="text-muted-foreground [overflow-wrap:anywhere]">
        {email.status === "sent" && email.sentAt
          ? `Salió el ${formatDateTime(email.sentAt, timezone)}`
          : email.status === "queued"
            ? "Espera su turno en la cola de envío."
            : email.error || "Sin motivo registrado."}
      </span>
    </p>
  );
}

function EmailRow({ email, when, onOpen }: { email: EmailNotification; when: string; onOpen: () => void }) {
  const delivery = deliveryOf(email);
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
          {email.businessName && ` · ${email.businessName}`}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="secondary">{TYPE_LABELS[email.type]}</Badge>
        <Badge variant={delivery.variant}>{delivery.label}</Badge>
      </span>
    </button>
  );
}
