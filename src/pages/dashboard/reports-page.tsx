import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { AppointmentsVolumeChart } from "@/features/reports/appointments-volume-chart";
import { RankedBars } from "@/features/reports/ranked-bars";
import {
  filterByRange,
  getClientRetention,
  getReportFetchRange,
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
import { useAppointments, useClientActivity } from "@/hooks/queries/use-appointments";
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
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const fetchRange = getReportFetchRange(now.date, period);
  const appointmentsQuery = useAppointments(fetchRange, { keepPrevious: true });
  const activityQuery = useClientActivity();
  const { servicesById, isPending: lookupsPending } = useLookups();
  const currency = business?.currency;

  const report = useMemo(() => {
    const range = getPeriodRange(now.date, period);
    const all = appointmentsQuery.data ?? [];
    const firstVisits = new Map((activityQuery.data ?? []).map((row) => [row.clientId, row.firstVisit]));
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
      retention: getClientRetention(inRange, firstVisits, range),
    };
  }, [appointmentsQuery.data, activityQuery.data, servicesById, now.date, period]);

  const { summary } = report;
  const loading = appointmentsQuery.isPending || activityQuery.isPending || lookupsPending;

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
          {/* La cifra que el profesional busca primero: cuánto generó en el periodo. */}
          <section
            aria-labelledby="revenue-heading"
            className="grid gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end"
          >
            <div>
              <h2 id="revenue-heading" className="text-sm font-semibold text-muted-foreground">
                Ingresos estimados en {period} días
              </h2>
              {loading ? (
                <Skeleton className="mt-2 h-12 w-48" />
              ) : (
                <p className="mt-1 text-5xl leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
                  {formatCurrency(summary.estimatedRevenue, currency)}
                </p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Cobrado en citas completadas:{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatCurrency(summary.completedRevenue, currency)}
                </span>
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 lg:border-l lg:pl-6">
              {[
                { label: "Hoy", value: report.revenue.day },
                { label: "Esta semana", value: report.revenue.week },
                { label: "Este mes", value: report.revenue.month },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-sm text-muted-foreground">{item.label}</dt>
                  <dd className="text-xl font-bold tabular-nums">
                    {loading ? <Skeleton className="h-7 w-16" /> : formatCurrency(item.value, currency)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <MetricStrip
            loading={loading}
            className="md:grid-cols-4 2xl:grid-cols-4"
            metrics={[
              { label: "Citas del periodo", value: summary.total },
              {
                label: "Completadas",
                value: summary.byStatus.completed,
                hint: `${percent(share(summary.byStatus.completed, summary.total))} del total`,
              },
              {
                label: "Cancelaciones",
                value: summary.byStatus.cancelled,
                hint: `${percent(share(summary.byStatus.cancelled, summary.total))} del total`,
              },
              {
                label: "No asistió",
                value: summary.byStatus.no_show,
                hint: summary.attendanceRate === null ? "Sin citas pasadas" : `Asistencia: ${percent(summary.attendanceRate)}`,
              },
            ]}
          />

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
