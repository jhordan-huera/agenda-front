import { CalendarOff, CalendarPlus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getServiceName, getUpcomingAppointments } from "@/features/appointments/appointment-utils";
import { useAppointmentDialogs } from "@/features/appointments/use-appointment-dialogs";
import { usePermissions } from "@/features/auth/use-permissions";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { BookingLinkCard } from "@/features/dashboard/booking-link-card";
import { getDashboardMetrics, getGreeting } from "@/features/dashboard/dashboard-metrics";
import { dayBounds, freeHoursLeft } from "@/features/dashboard/day-plan";
import { DayRibbon } from "@/features/dashboard/day-ribbon";
import { NextUp } from "@/features/dashboard/next-up";
import { PendingBookings } from "@/features/dashboard/pending-bookings";
import { PlanLimitBanner } from "@/features/dashboard/plan-limit-banner";
import { TodayList } from "@/features/dashboard/today-list";
import { WeekBars } from "@/features/dashboard/week-bars";
import { InstallAppCard } from "@/features/install/install-app";
import { BlockedTimeFormDialog } from "@/features/schedule/blocked-time-form-dialog";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useCurrentBusiness, useCurrentUser } from "@/hooks/queries/use-account";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { getErrorMessage } from "@/lib/data";
import { capitalize, formatCurrency, formatDate, plural } from "@/lib/format";
import { startOfWeekISO, timeToMinutes } from "@/lib/time";
import type { Appointment } from "@/types";

const PENDING_LIMIT = 4;

type QuickDialog = "client" | "block" | null;

/**
 * Inicio. Arriba, quién sigue (lo que el profesional mira entre paciente y paciente); debajo,
 * el día completo en una franja y lo que queda de hoy. A la derecha, lo que pide una acción
 * (citas por confirmar), la semana y el enlace de reservas.
 */
export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  // Sólo lo que usa Inicio: desde el inicio del mes (o de la semana, si empezó el mes anterior)
  // en adelante. Nunca el historial completo.
  const monthStart = `${now.date.slice(0, 7)}-01`;
  const weekStart = startOfWeekISO(now.date);
  const appointmentsQuery = useAppointments({ from: weekStart < monthStart ? weekStart : monthStart });
  const schedulesQuery = useSchedules();
  const blockedQuery = useBlockedTimes();
  const { clients, clientsById, servicesById, isPending: lookupsPending } = useLookups();
  const updateStatus = useUpdateAppointmentStatus();
  const dialogs = useAppointmentDialogs();
  const [quickDialog, setQuickDialog] = useState<QuickDialog>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { can } = usePermissions();
  const agendas = useAgendas();

  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);
  const metrics = useMemo(() => getDashboardMetrics(appointments, clients, now), [appointments, clients, now]);
  const schedules = schedulesQuery.data ?? [];
  const blockedTimes = blockedQuery.data ?? [];

  const today = appointments
    .filter((a) => a.date === now.date && a.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  // La cita en curso cuenta como "siguiente" hasta que termina.
  const current = today.find(
    (a) => timeToMinutes(a.startTime) <= now.minutes && timeToMinutes(a.endTime) > now.minutes && a.status !== "no_show",
  );
  const upcoming = getUpcomingAppointments(appointments, now);
  const next = current ?? upcoming[0] ?? null;
  const pending = upcoming.filter((a) => a.status === "pending").slice(0, PENDING_LIMIT);
  const bounds = dayBounds(now.date, today, schedules);
  const freeHours = freeHoursLeft(now.date, today, schedules, blockedTimes, now.minutes);
  const remaining = today.filter((a) => timeToMinutes(a.endTime) > now.minutes).length;
  const loading = appointmentsQuery.isPending || lookupsPending || schedulesQuery.isPending || blockedQuery.isPending;

  const clientName = (id: string) => clientsById.get(id)?.name ?? "Cliente";
  const serviceName = (id: string) => getServiceName(servicesById, id);

  const confirm = async (appointment: Appointment) => {
    setConfirmingId(appointment.id);
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status: "confirmed" });
      toast.success(`Cita de ${clientName(appointment.clientId)} confirmada`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirmingId(null);
    }
  };

  const summary = [
    user && `${getGreeting(now.minutes)}, ${user.firstName}.`,
    remaining
      ? `Te ${remaining === 1 ? "queda" : "quedan"} ${plural(remaining, "cita", "citas")} hoy y ${freeHours ? plural(freeHours, "hora libre", "horas libres") : "ninguna hora libre"}.`
      : "Hoy ya no te quedan citas.",
  ]
    .filter(Boolean)
    .join(" ");

  const closeQuickDialog = (open: boolean) => !open && setQuickDialog(null);

  return (
    <div className="space-y-8">
      <PageTitle title="Inicio" />
      <PageHeader
        title={capitalize(formatDate(now.date, "EEEE d 'de' MMMM"))}
        description={loading ? "…" : summary}
        actions={
          <>
            {can("schedule.manage") && (
              <Button variant="outline" size="lg" onClick={() => setQuickDialog("block")}>
                <CalendarOff /> Bloquear horario
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => setQuickDialog("client")}>
              <UserPlus /> Nuevo cliente
            </Button>
            <Button size="lg" onClick={() => dialogs.openCreate()}>
              <CalendarPlus /> Nueva cita
            </Button>
          </>
        }
      />

      <InstallAppCard className="lg:hidden" />

      <PlanLimitBanner />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
        <div className="min-w-0 space-y-8">
          {loading ? (
            <Skeleton className="h-44 rounded-2xl" />
          ) : appointmentsQuery.isError ? (
            <ErrorState onRetry={() => appointmentsQuery.refetch()} />
          ) : (
            <NextUp
              appointment={next}
              client={next ? clientsById.get(next.clientId) : undefined}
              serviceName={next ? serviceName(next.serviceId) : ""}
              business={business ?? undefined}
              now={now}
              onOpen={dialogs.openDetails}
              onCreate={() => dialogs.openCreate()}
            />
          )}

          <section aria-labelledby="day-heading">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="day-heading" className="font-bold">
                Tu día
              </h2>
              {!loading && (
                <p className="text-sm text-muted-foreground">
                  {plural(today.length, "cita", "citas")} hoy, {plural(metrics.todayPending, "por confirmar", "por confirmar")}
                </p>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-28 rounded-xl" />
            ) : bounds ? (
              <DayRibbon
                bounds={bounds}
                now={now}
                appointments={today}
                schedules={schedules}
                // Con varias agendas, en la franja del día sólo los bloqueos de todo el negocio.
                blockedTimes={agendas.multiple ? blockedTimes.filter((block) => block.professionalId === null) : blockedTimes}
                nextId={next?.date === now.date ? next.id : null}
                clientName={clientName}
                onOpen={dialogs.openDetails}
              />
            ) : (
              <p className="rounded-xl bg-muted px-4 py-6 text-center text-muted-foreground">
                Hoy no atiendes según tu horario.{" "}
                {can("schedule.manage") && (
                  <Link to="/dashboard/schedule" className="font-semibold text-ink underline underline-offset-4">
                    Revisar mis horarios
                  </Link>
                )}
              </p>
            )}
          </section>

          {!loading && (
            <TodayList
              professionalOf={agendas.multiple ? (appointment) => agendas.byId(appointment.professionalId) : undefined}
              appointments={today}
              now={now}
              nextId={next?.date === now.date ? next.id : null}
              clientName={clientName}
              serviceName={serviceName}
              onOpen={dialogs.openDetails}
              onConfirm={confirm}
              confirmingId={confirmingId}
            />
          )}

          {/* La semana y el mes, en la columna principal: se leen después del día. */}
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-end">
            <WeekBars appointments={appointments} now={now} />
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-muted p-4 sm:grid-cols-1">
              <div>
                <dt className="text-sm text-muted-foreground">Ingresos del mes</dt>
                <dd className="text-xl font-bold tabular-nums">{loading ? "…" : formatCurrency(metrics.monthRevenue, business?.currency)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Clientes activos</dt>
                <dd className="text-xl font-bold tabular-nums">{loading ? "…" : metrics.activeClients}</dd>
              </div>
            </dl>
          </div>
        </div>

        <aside className="grid content-start gap-10 md:grid-cols-2 xl:grid-cols-1">
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <PendingBookings
              appointments={pending}
              now={now}
              clientName={clientName}
              serviceName={serviceName}
              onOpen={dialogs.openDetails}
              onConfirm={confirm}
              confirmingId={confirmingId}
            />
          )}
          {business ? <BookingLinkCard slug={business.slug} /> : <Skeleton className="h-40 rounded-xl" />}
        </aside>
      </div>

      {dialogs.dialogs}
      <ClientFormDialog open={quickDialog === "client"} onOpenChange={closeQuickDialog} />
      <BlockedTimeFormDialog open={quickDialog === "block"} onOpenChange={closeQuickDialog} />
    </div>
  );
}
