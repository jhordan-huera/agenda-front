import { useState, type ReactNode } from "react";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { capitalize, formatCurrency, formatDateTime, formatShortDate } from "@/lib/format";
import { daysBetween } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Business, Client, DayOfWeek, ISODate, Professional } from "@/types";
import type { ReportData } from "./report-data";
import { heatmapKey, type LapsedClient } from "./report-insights";
import { compareValues, type ResolvedPeriod } from "./report-period";
import { share, type VolumeGranularity, type VolumePoint } from "./report-stats";
import { Trend } from "./trend";

/**
 * El reporte en papel (o PDF): un documento hecho para la hoja A4, no la página de pantalla. Sólo se
 * ve al imprimir. Tablas en lugar de tarjetas (pasan de una hoja a otra sin dejar huecos), un gráfico
 * propio de ancho fijo (no se redibuja al imprimir) y colores que salen aunque el navegador no
 * imprima fondos. Sin teléfonos ni emails de pacientes.
 */

const PRINT_LAPSED_LIMIT = 30;

/**
 * La hoja: A4 con márgenes y, en el pie, el negocio con el periodo y "Página X de Y". Las cajas de
 * arriba van vacías para tapar la fecha y el título que añade el navegador (Chrome 131+; en otros, se
 * quitan desmarcando "Encabezados y pies de página"). Sólo mientras Reportes está abierto.
 */
function pageRules(footer: string): string {
  const box = 'font-family: "Sora Variable", ui-sans-serif, sans-serif; font-size: 8pt; color: #5b6478;';
  return `@page {
  size: A4;
  margin: 14mm 12mm 16mm;
  @top-left { content: ""; }
  @top-center { content: ""; }
  @top-right { content: ""; }
  @bottom-left { content: ${JSON.stringify(footer)}; ${box} }
  @bottom-center { content: ""; }
  @bottom-right { content: "Página " counter(page) " de " counter(pages); ${box} }
}`;
}
const percent = (value: number) => `${Math.round(value * 100)} %`;

const DAY_SHORT: Record<DayOfWeek, string> = { 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 0: "Dom" };
const VOLUME_TITLES: Record<VolumeGranularity, string> = { day: "Citas por día", week: "Citas por semana", month: "Citas por mes" };

interface ReportPrintDocumentProps {
  business: Pick<Business, "name" | "logoUrl" | "timezone" | "currency">;
  period: ResolvedPeriod;
  /** "Todos los profesionales", el nombre del elegido o null con una sola agenda. */
  professionalLabel: string | null;
  report: ReportData;
  /** Tabla por profesional (varias agendas y "Todos"). */
  professionalsById: Map<string, Professional> | null;
  lapsed: LapsedClient[];
  lapsedThreshold: number;
  clientsById: Map<string, Client>;
  today: ISODate;
}

export function ReportPrintDocument({
  business,
  period,
  professionalLabel,
  report,
  professionalsById,
  lapsed,
  lapsedThreshold,
  clientsById,
  today,
}: ReportPrintDocumentProps) {
  const [generatedAt] = useState(() => new Date().toISOString());
  const { summary, previousSummary, channels, previousChannels, retention, previousRetention } = report;
  const currency = business.currency;
  const nameOf = (clientId: string) => clientsById.get(clientId)?.name ?? "Paciente";
  const compare = (current: number | null, previous: number | null, better: "up" | "down", kind: "relative" | "points" = "relative") =>
    report.hasPrevious && current !== null && previous !== null ? compareValues(current, previous, better, kind) : null;
  const trend = (...args: Parameters<typeof compare>) => <Trend comparison={compare(...args)} previousLabel={period.previousLabel} className="text-[10px]" />;

  const kpis: { label: string; value: string; previous: string; trend: ReactNode }[] = [
    {
      label: "Ingresos estimados",
      value: formatCurrency(summary.estimatedRevenue, currency),
      previous: formatCurrency(previousSummary.estimatedRevenue, currency),
      trend: trend(summary.estimatedRevenue, previousSummary.estimatedRevenue, "up"),
    },
    {
      label: "Cobrado (completadas)",
      value: formatCurrency(summary.completedRevenue, currency),
      previous: formatCurrency(previousSummary.completedRevenue, currency),
      trend: trend(summary.completedRevenue, previousSummary.completedRevenue, "up"),
    },
    { label: "Citas", value: String(summary.total), previous: String(previousSummary.total), trend: trend(summary.total, previousSummary.total, "up") },
    {
      label: "Completadas",
      value: String(summary.byStatus.completed),
      previous: String(previousSummary.byStatus.completed),
      trend: trend(summary.byStatus.completed, previousSummary.byStatus.completed, "up"),
    },
    {
      label: "Cancelaciones",
      value: String(summary.byStatus.cancelled),
      previous: String(previousSummary.byStatus.cancelled),
      trend: trend(summary.byStatus.cancelled, previousSummary.byStatus.cancelled, "down"),
    },
    {
      label: "No asistió",
      value: String(summary.byStatus.no_show),
      previous: String(previousSummary.byStatus.no_show),
      trend: trend(summary.byStatus.no_show, previousSummary.byStatus.no_show, "down"),
    },
    {
      label: "Ocupación del horario",
      value: report.occupancy === null ? "—" : percent(report.occupancy),
      previous: report.previousOccupancy === null ? "—" : percent(report.previousOccupancy),
      trend: report.occupancy === null ? null : trend(report.occupancy, report.previousOccupancy, "up", "points"),
    },
    {
      label: "Por tu página de reservas",
      value: String(channels.fromPage),
      previous: String(previousChannels.fromPage),
      trend: trend(channels.fromPage, previousChannels.fromPage, "up"),
    },
  ];

  return (
    <article className="hidden text-[11px] leading-snug text-foreground [-webkit-print-color-adjust:exact] [print-color-adjust:exact] print:block">
      <style>{pageRules(`${business.name} · ${period.label}`)}</style>
      {/* Encabezado */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-3">
        <div className="flex items-center gap-3">
          {business.logoUrl && <img src={business.logoUrl} alt="" className="size-12 rounded-lg object-cover" />}
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-primary uppercase">Reporte de actividad</p>
            <h1 className="text-xl leading-tight font-extrabold">{business.name}</h1>
            {professionalLabel && <p className="text-muted-foreground">{professionalLabel}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-bold">{period.label}</p>
          <p className="text-muted-foreground">Comparado con {period.previousLabel}</p>
          <p className="text-muted-foreground">Generado el {formatDateTime(generatedAt, business.timezone)}</p>
        </div>
      </header>

      {/* Resumen */}
      <Section title="Resumen" keepTogether>
        <div className="grid grid-cols-4 overflow-hidden rounded-lg border">
          {kpis.map((kpi, index) => (
            <div key={kpi.label} className={cn("p-2.5", index % 4 !== 3 && "border-r", index < 4 && "border-b")}>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p className="text-[17px] leading-tight font-extrabold tabular-nums">{kpi.value}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
                {kpi.trend}
                {report.hasPrevious && <span>antes {kpi.previous}</span>}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Al día de hoy: hoy {formatCurrency(report.revenue.day, currency)} · esta semana {formatCurrency(report.revenue.week, currency)} · este mes{" "}
          {formatCurrency(report.revenue.month, currency)}. Asistencia del periodo:{" "}
          {summary.attendanceRate === null ? "sin citas pasadas" : percent(summary.attendanceRate)}.
        </p>
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          ▲▼ frente a {period.previousLabel}: en verde si mejoró y en rojo si empeoró. "Ingresos estimados" suma las citas
          pendientes, confirmadas y completadas; "Cobrado", sólo las completadas. La ocupación compara las horas con citas con las
          horas de trabajo de tu horario actual.
        </p>
      </Section>

      {summary.total === 0 ? (
        <p className="mt-5 rounded-lg border p-4 text-center text-muted-foreground">Sin citas en este periodo.</p>
      ) : (
        <>
          <Section title={VOLUME_TITLES[report.granularity]} keepTogether>
            <PrintBarChart data={report.volume} />
          </Section>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <Section title="Días y horas más pedidos" keepTogether flush>
              <PrintHeatmap heatmap={report.heatmap} />
            </Section>
            <div>
              <Section title="De dónde llegan las citas" keepTogether flush>
                <PrintTable
                  head={["", "Citas", "Cambio"]}
                  rows={[
                    [`Por tu página (${percent(share(channels.fromPage, channels.total))})`, channels.fromPage, trend(channels.fromPage, previousChannels.fromPage, "up")],
                    ["Creadas en el panel", channels.fromPanel, trend(channels.fromPanel, previousChannels.fromPanel, "up")],
                    ["Pacientes nuevos por tu página", channels.newFromPage, trend(channels.newFromPage, previousChannels.newFromPage, "up")],
                  ]}
                />
              </Section>
              <Section title="Pacientes atendidos" keepTogether>
                <PrintTable
                  head={["", "Pacientes", "Cambio"]}
                  rows={[
                    ["Nuevos", retention.newClients, trend(retention.newClients, previousRetention.newClients, "up")],
                    ["Recurrentes", retention.returningClients, trend(retention.returningClients, previousRetention.returningClients, "up")],
                  ]}
                />
              </Section>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <Section title="Los que más vienen" keepTogether flush>
              <PrintTable
                head={["Paciente", "Citas", "Cobrado"]}
                rows={report.topClients.map((rank) => [nameOf(rank.clientId), rank.appointments, formatCurrency(rank.spent, currency)])}
                empty="Sin citas en este periodo."
              />
            </Section>
            <Section title="Los que más faltan" keepTogether flush>
              <PrintTable
                head={["Paciente", "Faltas", "Asistencia"]}
                rows={report.noShows.map((rank) => [nameOf(rank.clientId), rank.noShow, rank.attendance === null ? "—" : percent(rank.attendance)])}
                empty="Nadie faltó en este periodo."
              />
            </Section>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <Section title="Citas por estado" keepTogether flush>
              <PrintTable
                head={["Estado", "Citas", "%"]}
                rows={report.statuses.map(({ status, count, share: ratio }) => [APPOINTMENT_STATUS_CONFIG[status].label, count, percent(ratio)])}
              />
            </Section>
            <Section title="Servicios más reservados" keepTogether flush>
              <PrintTable
                head={["Servicio", "Citas", "Ingresos"]}
                rows={report.topServices.map((service) => [service.name, service.count, formatCurrency(service.revenue, currency)])}
                empty="Sin reservas en este periodo."
              />
            </Section>
          </div>

          {professionalsById && (
            <Section title="Por profesional">
              <PrintTable
                head={["Profesional", "Citas", "Atendidas", "No asistió", "Canceladas", "Asistencia", "Cobrado", "Ocupación"]}
                rows={report.byProfessional.map(({ professionalId, summary: own, occupancy }) => [
                  professionalsById.get(professionalId)?.displayName ?? "Profesional",
                  own.total - own.byStatus.cancelled,
                  own.byStatus.completed,
                  own.byStatus.no_show,
                  own.byStatus.cancelled,
                  own.attendanceRate === null ? "—" : percent(own.attendanceRate),
                  formatCurrency(own.completedRevenue, currency),
                  occupancy === null ? "—" : percent(occupancy),
                ])}
              />
            </Section>
          )}
        </>
      )}

      <Section title={`Pacientes que no volvieron (más de ${lapsedThreshold} días sin cita y ninguna por delante)`}>
        <PrintTable
          head={["Paciente", "Última visita", "Días sin venir", "Citas"]}
          rows={lapsed
            .slice(0, PRINT_LAPSED_LIMIT)
            .map((item) => [nameOf(item.clientId), capitalize(formatShortDate(item.lastVisit)), daysBetween(item.lastVisit, today), item.visits])}
          empty={`Ningún paciente lleva más de ${lapsedThreshold} días sin venir.`}
        />
        {lapsed.length > PRINT_LAPSED_LIMIT && (
          <p className="mt-1 text-[10px] text-muted-foreground">Y {lapsed.length - PRINT_LAPSED_LIMIT} pacientes más (la lista completa está en Reportes).</p>
        )}
      </Section>

    </article>
  );
}

function Section({ title, children, keepTogether, flush }: { title: string; children: ReactNode; keepTogether?: boolean; flush?: boolean }) {
  return (
    <section className={cn(!flush && "mt-5", keepTogether && "break-inside-avoid")}>
      <h2 className="mb-1.5 text-[12px] font-bold break-after-avoid">{title}</h2>
      {children}
    </section>
  );
}

function PrintTable({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  if (rows.length === 0 && empty) return <p className="rounded-lg border p-3 text-center text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b-2 border-border">
          {head.map((cell, index) => (
            <th key={index} className={cn("py-1 pr-2 text-[10px] font-semibold text-muted-foreground", index > 0 && "text-right")}>
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="break-inside-avoid border-b border-border/70">
            {row.map((cell, index) => (
              <td key={index} className={cn("py-1 pr-2 align-middle", index > 0 && "text-right tabular-nums")}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Barras en SVG de ancho fijo (viewBox): se ajustan a la hoja sin redibujarse. */
function PrintBarChart({ data }: { data: VolumePoint[] }) {
  const width = 720;
  const height = 150;
  const left = 26;
  const bottom = 18;
  const top = 8;
  const max = Math.max(1, ...data.map((point) => point.total));
  const band = (width - left) / Math.max(1, data.length);
  const barWidth = Math.min(18, band * 0.7);
  const plot = height - bottom - top;
  const every = Math.ceil(data.length / 16);
  const y = (value: number) => top + plot - (value / max) * plot;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Citas del periodo">
      {[0, Math.round(max / 2), max].map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width} y1={y(tick)} y2={y(tick)} stroke="var(--rule)" />
          <text x={left - 5} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">
            {tick}
          </text>
        </g>
      ))}
      {data.map((point, index) => {
        const x = left + index * band + (band - barWidth) / 2;
        return (
          <g key={point.key}>
            {point.total > 0 && <rect x={x} y={y(point.total)} width={barWidth} height={top + plot - y(point.total)} rx="2" fill="var(--primary)" />}
            {index % every === 0 && (
              <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
                {point.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PrintHeatmap({ heatmap }: { heatmap: ReportData["heatmap"] }) {
  const { days, hours, counts, max } = heatmap;
  if (max === 0) return <p className="rounded-lg border p-3 text-center text-muted-foreground">Sin citas en este periodo.</p>;
  return (
    <table className="w-full table-fixed border-separate border-spacing-px text-center text-[9px]">
      <thead>
        <tr>
          <th className="w-9" />
          {days.map((day) => (
            <th key={day} className="pb-0.5 font-semibold text-muted-foreground">
              {DAY_SHORT[day]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour}>
            <th className="pr-1 text-right font-normal text-muted-foreground tabular-nums">{`${String(hour).padStart(2, "0")}:00`}</th>
            {days.map((day) => {
              const count = counts.get(heatmapKey(day, hour)) ?? 0;
              return (
                <td
                  key={day}
                  className="h-4 rounded-sm font-semibold tabular-nums"
                  style={{ background: count === 0 ? "var(--muted)" : `color-mix(in oklch, var(--primary) ${10 + Math.round((count / max) * 45)}%, white)` }}
                >
                  {count || ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
