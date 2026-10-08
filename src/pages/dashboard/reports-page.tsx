import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { AppointmentsVolumeChart } from "@/features/reports/appointments-volume-chart";
import { RankedBars } from "@/features/reports/ranked-bars";
import {
  filterByRange,
  getClientRetention,
  getReportFetchRange,
  getPeriodRange,
  getProfessionalBreakdown,
  getRevenueSnapshot,
  getStatusBreakdown,
  getTopServices,
  getVolumeSeries,
  REPORT_PERIODS,
  share,
  summarize,
  type ProfessionalReport,
  type ReportPeriod,
} from "@/features/reports/report-stats";
import { ALL_AGENDAS, ProfessionalDot, ProfessionalSelect } from "@/features/professionals/professional-select";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments, useClientActivity } from "@/hooks/queries/use-appointments";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatCurrency, formatNumericDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Professional } from "@/types";

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
  // Con varias agendas: los reportes de un profesional o de todos (con la tabla por profesional).
  const agendas = useAgendas();
  const [agendaChoice, setAgendaChoice] = useState(ALL_AGENDAS);
  const agenda = agendas.multiple && agendas.all.some((p) => p.id === agendaChoice) ? agendaChoice : ALL_AGENDAS;
  const fetchRange = getReportFetchRange(now.date, period);
  const appointmentsQuery = useAppointments(fetchRange, { keepPrevious: true });
  const activityQuery = useClientActivity();
  const { data: schedules = [] } = useSchedules();
  const { data: blockedTimes = [] } = useBlockedTimes();
  const { servicesById, isPending: lookupsPending } = useLookups();
  const currency = business?.currency;

  const report = useMemo(() => {
    const range = getPeriodRange(now.date, period);
    const everyone = appointmentsQuery.data ?? [];
    const all = agenda === ALL_AGENDAS ? everyone : everyone.filter((a) => a.professionalId === agenda);
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
      // Las agendas activas y las que tuvieron citas en el periodo.
      byProfessional: getProfessionalBreakdown(
        inRange,
        range,
        agendas.all.filter((p) => p.isActive || inRange.some((a) => a.professionalId === p.id)).map((p) => p.id),
        schedules,
        blockedTimes,
      ),
    };
  }, [appointmentsQuery.data, activityQuery.data, servicesById, now.date, period, agenda, agendas.all, schedules, blockedTimes]);

  const { summary } = report;
  const loading = appointmentsQuery.isPending || activityQuery.isPending || lookupsPending;

  return (
    <div className="space-y-6">
      <PageTitle title="Reportes" />
      <PageHeader
        title="Reportes"
        description={`Del ${formatNumericDate(report.range.from)} al ${formatNumericDate(report.range.to)}`}
        actions={
          <>
            {agendas.multiple && (
              <ProfessionalSelect
                aria-label="Profesional"
                className="w-64"
                professionals={agendas.all}
                value={agenda}
                onValueChange={setAgendaChoice}
                allLabel="Todos los profesionales"
              />
            )}
            <Tabs value={String(period)} onValueChange={(value) => setPeriod(Number(value) as ReportPeriod)}>
              <TabsList aria-label="Periodo">
                {REPORT_PERIODS.map((days) => (
                  <TabsTrigger key={days} value={String(days)} className="px-3">
                    {days} días
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </>
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
              {agendas.multiple && agenda === ALL_AGENDAS && (
                <ProfessionalBreakdownCard
                  rows={report.byProfessional}
                  professionalsById={new Map(agendas.all.map((p) => [p.id, p]))}
                  currency={currency}
                />
              )}
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

/** Control del equipo: cuánto atendió cada profesional, cuántos no vinieron y qué tan llena estuvo su agenda. */
function ProfessionalBreakdownCard({
  rows,
  professionalsById,
  currency,
}: {
  rows: ProfessionalReport[];
  professionalsById: Map<string, Professional>;
  currency?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Por profesional</CardTitle>
        <CardDescription>
          Citas del periodo de cada agenda. Ocupación: horas con citas sobre las horas de su horario (sin bloqueos).
        </CardDescription>
      </CardHeader>
      {/* En el móvil y la tablet, una tarjeta por profesional; la tabla (ocho columnas) desde lg. */}
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map(({ professionalId, summary, occupancy }) => {
          const professional = professionalsById.get(professionalId);
          const stats = [
            { label: "Citas", value: summary.total - summary.byStatus.cancelled },
            { label: "Atendidas", value: summary.byStatus.completed },
            { label: "No asistió", value: summary.byStatus.no_show },
            { label: "Canceladas", value: summary.byStatus.cancelled },
            { label: "Asistencia", value: summary.attendanceRate === null ? "—" : percent(summary.attendanceRate) },
            { label: "Ocupación", value: occupancy === null ? "—" : percent(occupancy) },
          ];
          return (
            <div key={professionalId} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  {professional && <ProfessionalDot color={professional.color} />}
                  <span className="truncate">{professional?.displayName ?? "Profesional"}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-muted-foreground">Cobrado</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(summary.completedRevenue, currency)}</span>
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 border-t pt-3">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                    <dd className="font-semibold tabular-nums">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </CardContent>
      <CardContent className="hidden overflow-x-auto lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profesional</TableHead>
              <TableHead className="text-right">Citas</TableHead>
              <TableHead className="text-right">Atendidas</TableHead>
              <TableHead className="text-right">No asistió</TableHead>
              <TableHead className="text-right">Canceladas</TableHead>
              <TableHead className="text-right">Asistencia</TableHead>
              <TableHead className="text-right">Cobrado</TableHead>
              <TableHead className="text-right">Ocupación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ professionalId, summary, occupancy }) => {
              const professional = professionalsById.get(professionalId);
              return (
                <TableRow key={professionalId}>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      {professional && <ProfessionalDot color={professional.color} />}
                      {professional?.displayName ?? "Profesional"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{summary.total - summary.byStatus.cancelled}</TableCell>
                  <TableCell className="text-right tabular-nums">{summary.byStatus.completed}</TableCell>
                  <TableCell className="text-right tabular-nums">{summary.byStatus.no_show}</TableCell>
                  <TableCell className="text-right tabular-nums">{summary.byStatus.cancelled}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {summary.attendanceRate === null ? "—" : percent(summary.attendanceRate)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(summary.completedRevenue, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{occupancy === null ? "—" : percent(occupancy)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

