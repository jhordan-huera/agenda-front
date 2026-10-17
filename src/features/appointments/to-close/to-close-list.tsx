import { CheckCheck, CircleCheckBig, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { dayLabel } from "@/features/activity/day-groups";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useCloseAllAppointments, useCloseAppointment, useToCloseCount, useToCloseList } from "@/hooks/queries/use-to-close";
import { useBusinessNow } from "@/hooks/use-business-now";
import { useErrorToast } from "@/hooks/use-error-toast";
import { APPOINTMENT_STATUS_CONFIG, CLOSE_ALL_MAX, CLOSING_STATUSES, type ClosingStatus } from "@/lib/constants/appointment-status";
import { formatTimeRange, joinNames, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppointmentToClose, ISODate } from "@/types";

/** Las citas de un mismo día, en el orden de la lista (de la más vieja a la más nueva). */
function byDay(items: AppointmentToClose[], today: ISODate) {
  const groups: { date: ISODate; label: string; items: AppointmentToClose[] }[] = [];
  for (const item of items) {
    let group = groups.at(-1);
    if (!group || group.date !== item.date) {
      group = { date: item.date, label: dayLabel(item.date, today), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

/** «3 de días anteriores y 1 de hoy». */
function countsText(overdue: number, today: number): string {
  const parts = [overdue > 0 && `${overdue} de ${overdue === 1 ? "un día anterior" : "días anteriores"}`, today > 0 && `${today} de hoy`];
  return parts.filter(Boolean).join(" y ");
}

/**
 * La lista «Por cerrar» (spec 018): las citas que ya terminaron y siguen Pendiente o Confirmada, de la
 * más vieja a la más nueva, cada una con «Completada», «No asistió» y «Cancelada», y «Marcar todas como
 * completadas» (con confirmación). La casilla «Avisar a los pacientes» viene apagada: es un cierre
 * administrativo de citas que ya pasaron (decisión del dueño del producto). Con ella, el email del cambio
 * de estado (spec 008); sin WhatsApp, para cerrar el día en segundos. La usan la agenda (en un Sheet en el
 * celular) y la pantalla «Antes de seguir, cierra tus citas pendientes».
 */
export function ToCloseList({ className }: { className?: string }) {
  const list = useToCloseList();
  const counts = useToCloseCount();
  const closeOne = useCloseAppointment();
  const closeAll = useCloseAllAppointments();
  const showError = useErrorToast();
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const [notify, setNotify] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());

  if (list.isPending) return <ListSkeleton rows={3} className={className} />;
  if (list.isError) return <ErrorState className={className} onRetry={() => list.refetch()} />;

  const items = list.data.pages.flatMap((page) => page.appointments);
  const total = counts.total;
  const notLoaded = Math.max(0, total - items.length);

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center rounded-xl border border-dashed bg-background px-6 py-10 text-center", className)}>
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CircleCheckBig className="size-6" aria-hidden />
        </span>
        <p className="font-semibold">Todo al día</p>
        <p className="mt-1 text-sm text-muted-foreground">No te quedan citas por cerrar.</p>
      </div>
    );
  }

  const setRowBusy = (id: string, on: boolean) =>
    setBusy((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const close = async (item: AppointmentToClose, status: ClosingStatus) => {
    setRowBusy(item.id, true);
    try {
      await closeOne.mutateAsync({ id: item.id, status, notify });
      toast.success(`${joinNames(item.clientNames)}: ${APPOINTMENT_STATUS_CONFIG[status].label}`, {
        description: notify ? undefined : "Sin avisar al paciente.",
      });
    } catch (error) {
      showError(error);
    } finally {
      setRowBusy(item.id, false);
    }
  };

  // Las que se ven, en tandas de CLOSE_ALL_MAX (cada tanda, una transacción en la API).
  const markAll = async () => {
    const ids = items.map((item) => item.id);
    let closed = 0;
    let skipped = 0;
    try {
      for (let start = 0; start < ids.length; start += CLOSE_ALL_MAX) {
        const result = await closeAll.mutateAsync({ status: "completed", notify, ids: ids.slice(start, start + CLOSE_ALL_MAX) });
        closed += result.closed;
        skipped += result.skipped;
      }
    } catch (error) {
      showError(error);
      throw error;
    }
    toast.success(closed === 1 ? "Se marcó 1 cita como completada" : `Se marcaron ${closed} citas como completadas`, {
      description: [skipped > 0 && `${plural(skipped, "ya estaba cerrada", "ya estaban cerradas")}.`, !notify && "Sin avisar a los pacientes."]
        .filter(Boolean)
        .join(" ") || undefined,
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3 rounded-xl border bg-muted/40 p-3 sm:p-4">
        <p className="text-sm">
          <strong className="font-semibold">{plural(total, "cita por cerrar", "citas por cerrar")}</strong>
          {countsText(counts.overdue, counts.today) && <span className="text-muted-foreground"> · {countsText(counts.overdue, counts.today)}</span>}
        </p>
        <div className="flex items-start gap-2">
          <Checkbox
            id="to-close-notify"
            checked={notify}
            onCheckedChange={(checked) => setNotify(checked === true)}
            aria-describedby="to-close-notify-hint"
            className="mt-0.5"
          />
          <div className="grid gap-0.5">
            <Label htmlFor="to-close-notify" className="font-normal">
              Avisar a los pacientes
            </Label>
            <p id="to-close-notify-hint" className="text-xs text-muted-foreground">
              Por email, como al cambiar el estado en la ficha. Viene apagada: son citas que ya pasaron.
            </p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setConfirmAll(true)} disabled={closeAll.isPending}>
          {closeAll.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCheck aria-hidden />}
          Marcar todas como completadas
        </Button>
      </div>

      {byDay(items, now.date).map((group) => (
        <section key={group.date} aria-label={group.label} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {group.label}
            {group.items[0].overdue ? "" : " · ya terminaron"}
          </h3>
          <ul className="space-y-2">
            {group.items.map((item) => (
              <ToCloseRow key={item.id} item={item} busy={busy.has(item.id)} onClose={(status) => void close(item, status)} />
            ))}
          </ul>
        </section>
      ))}

      {list.hasNextPage && (
        <Button variant="outline" className="w-full" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
          {list.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
          Cargar más
        </Button>
      )}

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={items.length === 1 ? "¿Marcar la cita como completada?" : `¿Marcar las ${items.length} citas como completadas?`}
        description={[
          items.length === 1 ? "La cita de la lista quedará como completada." : `Las ${items.length} citas de la lista quedarán como completadas.`,
          notLoaded > 0 && `Quedan ${notLoaded} más por cargar: salen después.`,
          "Cada una queda en la actividad.",
          notify ? "Se avisará a los pacientes por email." : "No se avisará a los pacientes.",
        ]
          .filter(Boolean)
          .join(" ")}
        confirmLabel="Marcar como completadas"
        cancelLabel="Volver"
        onConfirm={markAll}
      />
    </div>
  );
}

/** Una cita de la lista: la hora, los pacientes, el servicio, el profesional y sus tres botones. */
function ToCloseRow({ item, busy, onClose }: { item: AppointmentToClose; busy: boolean; onClose: (status: ClosingStatus) => void }) {
  const names = joinNames(item.clientNames);
  return (
    <li className="rounded-xl border bg-background p-3 sm:flex sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink tabular-nums">{formatTimeRange(item.startTime, item.endTime)}</span>
          <StatusBadge status={item.status} />
        </p>
        <p className="mt-1 font-medium break-words">{names}</p>
        <p className="text-sm break-words text-muted-foreground">
          {item.serviceName} · {item.professionalName}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-0 sm:flex sm:shrink-0 sm:gap-2" role="group" aria-label={`Cerrar la cita de ${names}`}>
        {CLOSING_STATUSES.map((status) => (
          <Button
            key={status}
            size="sm"
            variant="outline"
            className="min-w-0 px-2 sm:px-3"
            disabled={busy}
            onClick={() => onClose(status)}
          >
            <span className={cn("size-2 shrink-0 rounded-full max-sm:hidden", APPOINTMENT_STATUS_CONFIG[status].dot)} aria-hidden />
            {APPOINTMENT_STATUS_CONFIG[status].label}
          </Button>
        ))}
      </div>
    </li>
  );
}
