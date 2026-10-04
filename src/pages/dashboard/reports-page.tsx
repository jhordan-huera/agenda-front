import { BarChart3, CalendarCheck, CalendarDays, CalendarRange, CalendarX, CircleCheck, Sun, UserX, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentsVolumeChart } from "@/features/reports/appointments-volume-chart";
import { RankedBars } from "@/features/reports/ranked-bars";
import {
  filterByRange,
  getClientRetention,
  getPeriodRange,
  getRevenueSnapshot,
  getStatusBreakdown,
  getTopServices,
  getVolumeSeries,
  REPORT_PERIODS,
  share,
  summarize,
  type ReportPeriod,
} from "@/features/reports/report-stats";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBusinessNow } from "@/hooks/use-business-now";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatCurrency, formatNumericDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const percent = (value: number) => `${Math.round(value * 100)} %`;

export default function ReportsPage() {
  return (
    <RequirePermission permission="reports.view">
      <ReportsPageContent />
    </RequirePermission>
  );
}

function ReportsPageContent() {
  const { data: business } = useCurrentBusiness();
  const now = useBusinessNow(business?.timezone);
  const appointmentsQuery = useAppointments();
  const { servicesById, isPending: lookupsPending } = useLookups();
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const currency = business?.currency;

  const report = useMemo(() => {
    const range = getPeriodRange(now.date, period);
    const all = appointmentsQuery.data ?? [];
    const inRange = filterByRange(all, range);
    const summary = summarize(inRange);
    const groupedByWeek = period === 90;
    return {
      range,
      summary,
      groupedByWeek,
      volume: getVolumeSeries(inRange, range, groupedByWeek),
      statuses: getStatusBreakdown(summary),
      topServices: getTopServices(inRange, servicesById),
      revenue: getRevenueSnapshot(all, now.date),
      retention: getClientRetention(all, range),
    };
  }, [appointmentsQuery.data, servicesById, now.date, period]);

  const { summary } = report;
  const loading = appointmentsQuery.isPending || lookupsPending;

  return (
    <div className="space-y-6">
      <PageTitle title="Reportes" />
      <PageHeader
        title="Reportes"
        description={`Del ${formatNumericDate(report.range.from)} al ${formatNumericDate(report.range.to)}`}
        actions={
          <Tabs value={String(period)} onValueChange={(value) => setPeriod(Number(value) as ReportPeriod)}>
            <TabsList aria-label="Periodo">
              {REPORT_PERIODS.map((days) => (
                <TabsTrigger key={days} value={String(days)} className="px-3">
                  {days} días
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {appointmentsQuery.isError ? (
        <ErrorState onRetry={() => appointmentsQuery.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Total de citas" value={summary.total} icon={CalendarCheck} loading={loading} />
            <StatCard
              label="Completadas"
              value={summary.byStatus.completed}
              icon={CircleCheck}
              hint={`${percent(share(summary.byStatus.completed, summary.total))} del total`}
              loading={loading}
            />
            <StatCard
              label="Cancelaciones"
              value={summary.byStatus.cancelled}
              icon={CalendarX}
              hint={`${percent(share(summary.byStatus.cancelled, summary.total))} del total`}
              loading={loading}
            />
            <StatCard
              label="No asistió"
              value={summary.byStatus.no_show}
              icon={UserX}
              hint={
                summary.attendanceRate === null
                  ? "Sin citas pasadas"
                  : `Asistencia: ${percent(summary.attendanceRate)}`
              }
              loading={loading}
            />
            <StatCard
              label="Ingresos estimados"
              value={formatCurrency(summary.estimatedRevenue, currency)}
              icon={Wallet}
              hint={`Cobrado (completadas): ${formatCurrency(summary.completedRevenue, currency)}`}
              loading={loading}
            />
          </div>

          <section aria-labelledby="revenue-heading" className="space-y-3">
            <h2 id="revenue-heading" className="text-sm font-medium text-muted-foreground">
              Ingresos estimados (citas no canceladas)
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              <StatCard label="Hoy" value={formatCurrency(report.revenue.day, currency)} icon={Sun} loading={loading} />
              <StatCard label="Esta semana" value={formatCurrency(report.revenue.week, currency)} icon={CalendarDays} loading={loading} />
              <StatCard label="Este mes" value={formatCurrency(report.revenue.month, currency)} icon={CalendarRange} loading={loading} />
            </div>
          </section>

          {loading ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : summary.total === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Aún no hay datos en este periodo"
              description="Cuando registres citas, aquí verás su evolución, estados y servicios más reservados."
            />
          ) : (
            <>
              <AppointmentsVolumeChart data={report.volume} groupedByWeek={report.groupedByWeek} />
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por estado</CardTitle>
                    <CardDescription>Proporción de citas del periodo según su estado.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RankedBars
                      max={summary.total}
                      items={report.statuses.map(({ status, count, share: ratio }) => ({
                        key: status,
                        value: count,
                        label: (
                          <span className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full", APPOINTMENT_STATUS_CONFIG[status].dot)} aria-hidden />
                            {APPOINTMENT_STATUS_CONFIG[status].label}
                          </span>
                        ),
                        detail: `${count} · ${percent(ratio)}`,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Servicios más reservados</CardTitle>
                    <CardDescription>Citas no canceladas e ingresos estimados por servicio.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.topServices.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Sin reservas en este periodo.</p>
                    ) : (
                      <RankedBars
                        items={report.topServices.map((service) => ({
                          key: service.serviceId,
                          value: service.count,
                          label: <span className="font-medium">{service.name}</span>,
                          detail: `${service.count} citas · ${formatCurrency(service.revenue, currency)}`,
                        }))}
                      />
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Clientes</CardTitle>
                    <CardDescription>Clientes atendidos en el periodo: nuevos o que ya habían venido antes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RankedBars
                      max={Math.max(1, report.retention.newClients + report.retention.returningClients)}
                      items={[
                        {
                          key: "new",
                          value: report.retention.newClients,
                          label: <span className="font-medium">Clientes nuevos</span>,
                          detail: report.retention.newClients,
                        },
                        {
                          key: "returning",
                          value: report.retention.returningClients,
                          label: <span className="font-medium">Clientes recurrentes</span>,
                          detail: report.retention.returningClients,
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
