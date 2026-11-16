import { CalendarClock, CalendarPlus, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useControlReminders, useRemoveControlReminder } from "@/hooks/queries/use-control-reminders";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getErrorMessage } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import { buildControlWhatsAppMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, ControlReminder } from "@/types";
import { controlBookingUrl, describeControlDue } from "./control-reminder-text";

/**
 * Los controles de la Agenda (spec 051): a la derecha en el computador y desde abajo en el celular, como la lista de
 * espera. Los vencidos de los últimos 90 días (lo más antiguo está en Reportes → «Pacientes que no volvieron», revisión
 * del EGM) y los de los próximos 30 días; con varias agendas, los de la agenda elegida. Cada paciente:
 * escribirle por WhatsApp, «Agendar» (la cita nueva con el paciente, el servicio y el profesional) y «Quitar».
 */
export function ControlRemindersSheet({
  open,
  onOpenChange,
  business,
  agendaId,
  onSchedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  /** La agenda que se está viendo (null: todas). */
  agendaId: string | null;
  onSchedule: (control: ControlReminder) => void;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const query = useControlReminders(true);
  const agendas = useAgendas();
  const remove = useRemoveControlReminder();
  const [removing, setRemoving] = useState<ControlReminder | null>(null);
  const today = getZonedNow(business.timezone).date;
  const controls = (query.data ?? []).filter((control) => !agendaId || control.professionalId === agendaId);
  const overdue = controls.filter((control) => control.dueOn < today);
  const upcoming = controls.filter((control) => control.dueOn >= today);
  const emailOn = business.notificationSettings.controlReminders === true;

  const card = (control: ControlReminder) => {
    const due = describeControlDue(control.dueOn, today);
    const bookingUrl = controlBookingUrl(window.location.origin, business.slug, control);
    const whatsAppUrl = control.clientPhone
      ? getWhatsAppUrl(
          control.clientPhone,
          business.timezone,
          buildControlWhatsAppMessage({ clientName: control.clientName, businessName: business.name, serviceName: control.serviceName, bookingUrl }),
        )
      : null;
    return (
      <article key={control.appointmentId} className="space-y-3 rounded-xl border bg-card p-4" aria-label={control.clientName}>
        <div>
          <p className="font-semibold">{control.clientName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{due.label}</p>
        </div>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Servicio</dt>
          <dd className="min-w-0">{control.serviceName}</dd>
          {agendas.multiple && (
            <>
              <dt className="text-muted-foreground">Con</dt>
              <dd className="min-w-0">{control.professionalName}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Última cita</dt>
          <dd>{formatDate(control.lastDate, "d 'de' MMMM yyyy")}</dd>
          <dt className="text-muted-foreground">Le toca</dt>
          <dd>{formatDate(control.dueOn, "d 'de' MMMM")}</dd>
          {control.clientPhone && (
            <>
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd className="inline-flex min-w-0 items-center gap-1">
                <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> {control.clientPhone}
              </dd>
            </>
          )}
          {control.emailedAt && (
            <>
              <dt className="text-muted-foreground">Email</dt>
              <dd>Le escribimos el {formatDate(control.emailedAt.slice(0, 10), "d 'de' MMMM")}</dd>
            </>
          )}
        </dl>
        <div className="flex flex-wrap gap-2">
          {whatsAppUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> WhatsApp
              </a>
            </Button>
          )}
          <Button size="sm" onClick={() => onSchedule(control)}>
            <CalendarPlus /> Agendar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRemoving(control)}>
            <Trash2 /> Quitar
          </Button>
        </div>
      </article>
    );
  };

  const group = (title: string, items: ControlReminder[]) =>
    items.length > 0 && (
      <section className="space-y-3" aria-label={title}>
        <h3 className="text-sm font-semibold text-muted-foreground">
          {title} ({items.length})
        </h3>
        {items.map(card)}
      </section>
    );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={isDesktop ? "right" : "bottom"} className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl")}>
          <SheetHeader className="gap-1 border-b pr-12">
            <SheetTitle className="text-lg leading-snug font-semibold">Controles</SheetTitle>
            <SheetDescription>
              {query.isPending
                ? "Cargando…"
                : `${controls.length === 1 ? "A 1 paciente le toca" : `A ${controls.length} pacientes les toca`} volver${
                    agendaName(agendas, agendaId) ? ` con ${agendaName(agendas, agendaId)}` : ""
                  }. ${
                    emailOn
                      ? "A quien tiene email y no pidió dejar de recibirlos, le escribimos el día que le toca."
                      : "El email automático está apagado: escríbeles por WhatsApp o enciéndelo en Configuración → Notificaciones."
                  }`}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {query.isPending ? (
              Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40 rounded-xl" />)
            ) : query.isError ? (
              <ErrorState onRetry={() => query.refetch()} />
            ) : controls.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                <CalendarClock className="mx-auto mb-2 size-6 text-ink" aria-hidden />
                Nadie tiene un control pendiente en los próximos 30 días. Salen aquí los pacientes de los servicios con «Volver en», que
                se elige en cada servicio.
              </div>
            ) : (
              <>
                {group("Vencidos en los últimos 90 días", overdue)}
                {group("Próximos 30 días", upcoming)}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(next) => !next && setRemoving(null)}
        title={`¿Quitar el control de ${removing?.clientName ?? "este paciente"}?`}
        description="Sale de la lista y no le escribimos por este control. Si vuelve a tener una cita atendida de este servicio, tendrá uno nuevo. Queda en la actividad."
        confirmLabel="Quitar"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.appointmentId);
            toast.success(`Quitamos el control de ${removing.clientName.split(" ")[0]}`);
            setRemoving(null);
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </>
  );
}

const agendaName = (agendas: ReturnType<typeof useAgendas>, agendaId: string | null) => (agendaId ? agendas.byId(agendaId)?.displayName : null);
