import {
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CalendarPlus,
  CalendarX,
  ConciergeBell,
  Hourglass,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentListItem } from "@/features/appointments/appointment-list-item";
import { getClientName, getServiceName, getUpcomingAppointments } from "@/features/appointments/appointment-utils";
import { useAppointmentDialogs } from "@/features/appointments/use-appointment-dialogs";
import { usePermissions } from "@/features/auth/use-permissions";
import { ClientFormDialog } from "@/features/clients/client-form-dialog";
import { BookingLinkCard } from "@/features/dashboard/booking-link-card";
import { getDashboardMetrics, getGreeting } from "@/features/dashboard/dashboard-metrics";
import { PlanLimitBanner } from "@/features/dashboard/plan-limit-banner";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { WeekOverview } from "@/features/dashboard/week-overview";
import { BlockedTimeFormDialog } from "@/features/schedule/blocked-time-form-dialog";
import { ServiceFormDialog } from "@/features/services/service-form-dialog";
import { useCurrentBusiness, useCurrentUser } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBusinessNow } from "@/hooks/use-business-now";
import { capitalize, formatCurrency, formatLongDate, formatTimeRange, plural } from "@/lib/format";

const UPCOMING_LIMIT = 6;

type QuickDialog = "client" | "service" | "block" | null;

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const appointmentsQuery = useAppointments();
  const { clients, clientsById, servicesById, isPending: lookupsPending } = useLookups();
  const dialogs = useAppointmentDialogs();
  const [quickDialog, setQuickDialog] = useState<QuickDialog>(null);
  const { can } = usePermissions();

  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);
  const metrics = useMemo(() => getDashboardMetrics(appointments, clients, now), [appointments, clients, now]);
  const upcoming = getUpcomingAppointments(appointments, now).slice(0, UPCOMING_LIMIT);
  const loading = appointmentsQuery.isPending || lookupsPending;

  const closeQuickDialog = (open: boolean) => !open && setQuickDialog(null);

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" />
      <PageHeader
        title={user ? `${getGreeting(now.minutes)}, ${user.firstName}` : "Dashboard"}
        description={`${capitalize(formatLongDate(now.date))}${business ? ` · ${business.name}` : ""}`}
        actions={
          <Button size="lg" onClick={() => dialogs.openCreate()}>
            <CalendarPlus /> Nueva cita
          </Button>
        }
      />

      <PlanLimitBanner />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Citas de hoy"
          value={metrics.todayCount}
          icon={CalendarCheck}
          hint={metrics.todayPending ? plural(metrics.todayPending, "pendiente de confirmar", "pendientes de confirmar") : "Todo confirmado"}
          loading={loading}
        />
        <StatCard
          label="Citas de esta semana"
          value={metrics.weekCount}
          icon={CalendarDays}
          hint={plural(metrics.weekCompleted, "completada", "completadas")}
          loading={loading}
        />
        <StatCard
          label="Clientes"
          value={metrics.activeClients}
          icon={Users}
          hint={`${plural(metrics.newClientsThisMonth, "nuevo", "nuevos")} este mes`}
          loading={loading}
        />
        <StatCard
          label="Ingresos estimados"
          value={formatCurrency(metrics.monthRevenue, business?.currency)}
          icon={Wallet}
          hint="Este mes · citas no canceladas"
          loading={loading}
        />
        <StatCard
          label="Citas pendientes"
          value={metrics.pendingUpcoming}
          icon={Hourglass}
          hint="Próximas, sin confirmar"
          loading={loading}
        />
        <StatCard
          label="Cancelaciones"
          value={metrics.monthCancellations}
          icon={CalendarX}
          hint="Este mes"
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Próximas citas</CardTitle>
            <CardAction>
              <Link to="/dashboard/calendar" className="text-sm font-medium text-primary hover:underline">
                Ver agenda
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ListSkeleton rows={4} />
            ) : appointmentsQuery.isError ? (
              <ErrorState onRetry={() => appointmentsQuery.refetch()} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Tu agenda está libre"
                description="Agenda tu primera cita para comenzar."
                className="border-0"
                action={
                  <Button onClick={() => dialogs.openCreate()}>
                    <CalendarPlus /> Crear cita
                  </Button>
                }
              />
            ) : (
              <ul className="-mx-3 divide-y">
                {upcoming.map((appointment) => (
                  <AppointmentListItem
                    key={appointment.id}
                    appointment={appointment}
                    title={getClientName(clientsById, appointment.clientId)}
                    subtitle={`${getServiceName(servicesById, appointment.serviceId)} · ${formatTimeRange(appointment.startTime, appointment.endTime)}`}
                    showDate={appointment.date !== now.date}
                    onClick={dialogs.openDetails}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <QuickActions
            actions={[
              { label: "Nueva cita", icon: CalendarPlus, onClick: () => dialogs.openCreate() },
              { label: "Nuevo cliente", icon: UserPlus, onClick: () => setQuickDialog("client") },
              can("services.manage") && { label: "Nuevo servicio", icon: ConciergeBell, onClick: () => setQuickDialog("service") },
              can("schedule.manage") && { label: "Bloquear horario", icon: CalendarOff, onClick: () => setQuickDialog("block") },
            ].filter((action) => action !== false)}
          />
          {business ? <BookingLinkCard slug={business.slug} /> : <Skeleton className="h-40 rounded-xl" />}
        </div>
      </div>

      {loading ? <Skeleton className="h-48 rounded-xl" /> : <WeekOverview appointments={appointments} today={now.date} />}

      {dialogs.dialogs}
      <ClientFormDialog open={quickDialog === "client"} onOpenChange={closeQuickDialog} />
      <ServiceFormDialog open={quickDialog === "service"} onOpenChange={closeQuickDialog} />
      <BlockedTimeFormDialog open={quickDialog === "block"} onOpenChange={closeQuickDialog} />
    </div>
  );
}
