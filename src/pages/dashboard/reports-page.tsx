import { BarChart3, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricStrip } from "@/features/dashboard/metric-strip";
import { AppointmentsVolumeChart } from "@/features/reports/appointments-volume-chart";
import { BookingChannelsCard } from "@/features/reports/booking-channels-card";
import { DemandHeatmap } from "@/features/reports/demand-heatmap";
import { LapsedClientsCard } from "@/features/reports/lapsed-clients-card";
import { PeriodPicker } from "@/features/reports/period-picker";
import { RankedBars } from "@/features/reports/ranked-bars";
import { buildReport } from "@/features/reports/report-data";
import { getLapsedClients, type ClientVisits, type LapsedThreshold } from "@/features/reports/report-insights";
import { compareValues, getReportFetchRange, resolvePeriod, type ReportPeriodChoice } from "@/features/reports/report-period";
import { ReportPrintDocument } from "@/features/reports/report-print-document";
import { share, type ProfessionalReport } from "@/features/reports/report-stats";
import { TopClientsCards } from "@/features/reports/top-clients-cards";
import { Trend } from "@/features/reports/trend";
import { ALL_AGENDAS, ProfessionalDot, ProfessionalSelect } from "@/features/professionals/professional-select";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useAppointments, useClientActivity } from "@/hooks/queries/use-appointments";
import { useClients } from "@/hooks/queries/use-clients";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useBlockedTimes, useSchedules } from "@/hooks/queries/use-schedule";
import { useBusinessNow } from "@/hooks/use-business-now";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { formatCurrency } from "@/lib/format";
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
  const [choice, setChoice] = useState<ReportPeriodChoice>({ kind: "days", days: 30 });
  const period = useMemo(() => resolvePeriod(choice, now.date), [choice, now.date]);
  // Con varias agendas: los reportes de un profesional o de todos (con la tabla por profesional).
  const agendas = useAgendas();
  const [agendaChoice, setAgendaChoice] = useState(ALL_AGENDAS);
  const agenda = agendas.multiple && agendas.all.some((p) => p.id === agendaChoice) ? agendaChoice : ALL_AGENDAS;
  // Una sola consulta: el periodo, el de comparación y la semana y el mes en curso.
  const appointmentsQuery = useAppointments(getReportFetchRange(period, now.date), { keepPrevious: true });
  const activityQuery = useClientActivity();
  const clientsQuery = useClients();
  const { data: schedules = [] } = useSchedules();
  const { data: blockedTimes = [] } = useBlockedTimes();
  const { servicesById, isPending: lookupsPending } = useLookups();
  const currency = business?.currency;

  const report = useMemo(() => {
    const everyone = appointmentsQuery.data ?? [];
    const inRange = (a: (typeof everyone)[number]) => a.date >= period.range.from && a.date <= period.range.to;
    // Agendas de la ocupación: la elegida, la propia (rol Profesional) o las activas y las que tuvieron citas.
    const agendaIds =
      agenda !== ALL_AGENDAS
        ? [agenda]
        : agendas.scoped && agendas.ownProfessionalId
          ? [agendas.ownProfessionalId]
          : agendas.all.filter((p) => p.isActive || everyone.some((a) => a.professionalId === p.id && inRange(a))).map((p) => p.id);
    return buildReport({
      appointments: agenda === ALL_AGENDAS ? everyone : everyone.filter((a) => a.professionalId === agenda),
      firstVisits: new Map((activityQuery.data ?? []).map((row) => [row.clientId, row.firstVisit])),
      period,
      today: now.date,
      servicesById,
      agendaIds,
      schedules,
      blockedTimes,
    });
  }, [appointmentsQuery.data, activityQuery.data, servicesById, now.date, period, agenda, agendas.all, agendas.scoped, agendas.ownProfessionalId, schedules, blockedTimes]);

  // "No volvieron" mira todo el historial de cada paciente (lo resume la API).
  const visits = useMemo<ClientVisits[]>(
    () =>
      (activityQuery.data ?? []).map((row) => ({
        clientId: row.clientId,
        visits: row.totalAppointments,
        firstVisit: row.firstVisit,
        lastVisit: row.lastAppointment?.date ?? null,
        hasUpcoming: row.nextAppointment !== null,
      })),
    [activityQuery.data],
  );
  const clientsById = useMemo(() => new Map((clientsQuery.data ?? []).map((client) => [client.id, client])), [clientsQuery.data]);
  // El umbral de "no volvieron" vive aquí: la pantalla y el documento impreso muestran la misma lista.
  const [lapsedThreshold, setLapsedThreshold] = useState<LapsedThreshold>(60);
  const lapsed = useMemo(() => {
    const activeIds = new Set((clientsQuery.data ?? []).filter((client) => client.isActive).map((client) => client.id));
    return getLapsedClients(visits, activeIds, now.date, lapsedThreshold);
  }, [visits, clientsQuery.data, now.date, lapsedThreshold]);

  const { summary, previousSummary } = report;
  // Al cambiar de periodo se mantienen las citas del anterior mientras llegan las nuevas: sus cifras
  // no son las del periodo elegido, así que se muestra cargando.
  const loading =
    appointmentsQuery.isPending || appointmentsQuery.isPlaceholderData || activityQuery.isPending || clientsQuery.isPending || lookupsPending;
  /** El cambio de una cifra frente al periodo anterior (sin datos del anterior: "Sin datos para comparar"). */
  const trend = (current: number | null, previous: number | null, better: "up" | "down", kind: "relative" | "points" = "relative") => (
    <Trend
      comparison={report.hasPrevious && current !== null && previous !== null ? compareValues(current, previous, better, kind) : null}
      previousLabel={period.previousLabel}
    />
  );
  const professionalLabel = !agendas.multiple ? null : agenda === ALL_AGENDAS ? "Todos los profesionales" : (agendas.byId(agenda)?.displayName ?? null);

  return (
    <div className="space-y-6">
      <PageTitle title="Reportes" />
      {/* En papel o PDF sale un documento hecho para la hoja (report-print-document.tsx), no esta pantalla. */}
      {business && !loading && (
        <ReportPrintDocument
          business={business}
          period={period}
          professionalLabel={professionalLabel}
          report={report}
          professionalsById={agendas.multiple && agenda === ALL_AGENDAS ? new Map(agendas.all.map((p) => [p.id, p])) : null}
          lapsed={lapsed}
          lapsedThreshold={lapsedThreshold}
          clientsById={clientsById}
          today={now.date}
        />
      )}
      <div className="print:hidden">
        <PageHeader
          title="Reportes"
          description={`${period.label} · comparado con ${period.previousLabel}`}
          actions={
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:items-end">
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {agendas.multiple && (
                  <ProfessionalSelect
                    aria-label="Profesional"
                    className="w-full sm:w-64"
                    professionals={agendas.all}
                    value={agenda}
                    onValueChange={setAgendaChoice}
                    allLabel="Todos los profesionales"
                  />
                )}
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer /> Imprimir o PDF
                </Button>
              </div>
              <PeriodPicker value={choice} onChange={setChoice} today={now.date} />
            </div>
          }
        />
      </div>

      {appointmentsQuery.isError ? (
        <ErrorState onRetry={() => appointmentsQuery.refetch()} />
      ) : (
        <div className="space-y-6 print:hidden">
          {/* La cifra que el profesional busca primero: cuánto generó en el periodo. */}
          <section
            aria-labelledby="revenue-heading"
            className="grid grid-cols-1 gap-6 rounded-xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end"
          >
            <div>
              <h2 id="revenue-heading" className="text-sm font-semibold text-muted-foreground">
                Ingresos estimados del periodo
              </h2>
              {loading ? (
                <Skeleton className="mt-2 h-12 w-48" />
              ) : (
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-5xl leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
                    {formatCurrency(summary.estimatedRevenue, currency)}
                  </p>
                  {trend(summary.estimatedRevenue, previousSummary.estimatedRevenue, "up")}
                </div>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                <span>
                  Cobrado en citas completadas:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {loading ? "…" : formatCurrency(summary.completedRevenue, currency)}
                  </span>
                </span>
                {!loading && trend(summary.completedRevenue, previousSummary.completedRevenue, "up")}
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
            metrics={[
              { label: "Citas del periodo", value: summary.total, trend: trend(summary.total, previousSummary.total, "up") },
              {
                label: "Completadas",
                value: summary.byStatus.completed,
                trend: trend(summary.byStatus.completed, previousSummary.byStatus.completed, "up"),
                hint: `${percent(share(summary.byStatus.completed, summary.total))} del total`,
              },
              {
                label: "Cancelaciones",
                value: summary.byStatus.cancelled,
                trend: trend(summary.byStatus.cancelled, previousSummary.byStatus.cancelled, "down"),
                hint: `${percent(share(summary.byStatus.cancelled, summary.total))} del total`,
              },
              {
                label: "No asistió",
                value: summary.byStatus.no_show,
                trend: trend(summary.byStatus.no_show, previousSummary.byStatus.no_show, "down"),
                hint: summary.attendanceRate === null ? "Sin citas pasadas" : `Asistencia: ${percent(summary.attendanceRate)}`,
              },
              {
                label: "Ocupación",
                value: report.occupancy === null ? "—" : percent(report.occupancy),
                trend: report.occupancy === null ? undefined : trend(report.occupancy, report.previousOccupancy, "up", "points"),
                hint: report.occupancy === null ? "Configura tu horario para verla" : "De tus horas de trabajo",
              },
              {
                label: "Por tu página",
                value: report.channels.fromPage,
                trend: trend(report.channels.fromPage, report.previousChannels.fromPage, "up"),
                hint: `${percent(share(report.channels.fromPage, report.channels.total))} de las citas`,
              },
            ]}
          />

          {loading ? (
            <Skeleton className="h-80 rounded-xl" />
          ) : summary.total === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Aún no hay datos en este periodo"
              description="Cuando registres citas, aquí verás su evolución, de dónde llegan, cuándo te las piden y tus pacientes más fieles."
            />
          ) : (
            <>
              <AppointmentsVolumeChart data={report.volume} granularity={report.granularity} />
              {agendas.multiple && agenda === ALL_AGENDAS && (
                <ProfessionalBreakdownCard
                  rows={report.byProfessional}
                  professionalsById={new Map(agendas.all.map((p) => [p.id, p]))}
                  currency={currency}
                />
              )}
              {/* El mapa a la izquierda; a la derecha, de dónde llegan y quiénes son (nuevos o recurrentes). */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <DemandHeatmap heatmap={report.heatmap} />
                <div className="grid grid-cols-1 content-start gap-6">
                  <BookingChannelsCard
                    current={report.channels}
                    previous={report.hasPrevious ? report.previousChannels : null}
                    previousLabel={period.previousLabel}
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Pacientes</CardTitle>
                      <CardDescription>Pacientes atendidos en el periodo: nuevos o que ya habían venido antes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RankedBars
                        max={Math.max(1, report.retention.newClients + report.retention.returningClients)}
                        items={[
                          {
                            key: "new",
                            value: report.retention.newClients,
                            label: <span className="font-medium">Pacientes nuevos</span>,
                            detail: (
                              <span className="inline-flex items-center gap-2">
                                {report.retention.newClients}
                                {trend(report.retention.newClients, report.previousRetention.newClients, "up")}
                              </span>
                            ),
                          },
                          {
                            key: "returning",
                            value: report.retention.returningClients,
                            label: <span className="font-medium">Pacientes recurrentes</span>,
                            detail: (
                              <span className="inline-flex items-center gap-2">
                                {report.retention.returningClients}
                                {trend(report.retention.returningClients, report.previousRetention.returningClients, "up")}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TopClientsCards top={report.topClients} noShows={report.noShows} clientsById={clientsById} currency={currency} />
              </div>
            </>
          )}

          {!loading && business && (
            <LapsedClientsCard
              lapsed={lapsed}
              threshold={lapsedThreshold}
              onThresholdChange={setLapsedThreshold}
              clientsById={clientsById}
              business={business}
              today={now.date}
            />
          )}

          {!loading && summary.total > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            </div>
          )}
        </div>
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
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
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

