# Contrato: cálculos y componentes de Reportes

Funciones puras (sin React) y la interfaz de los componentes nuevos. Lo que no figura aquí mantiene
su interfaz actual.

## `report-period.ts`

```ts
type ReportPeriodChoice =
  | { kind: "days"; days: 7 | 30 | 90 }
  | { kind: "month"; month: string }            // "2026-09"
  | { kind: "range"; from: ISODate; to: ISODate };

interface ResolvedPeriod {
  range: DateRange;        // lo que se reporta
  previous: DateRange;     // con qué se compara
  label: string;           // "Del 1 al 13 de octubre de 2026"
  previousLabel: string;   // "del 1 al 13 de septiembre"
}

const MAX_RANGE_DAYS = 366;
function resolvePeriod(choice: ReportPeriodChoice, today: ISODate): ResolvedPeriod;
/** null si es válido; si no, el motivo ("La fecha final es anterior…", "Elige hasta 366 días…"). */
function rangeError(from: ISODate, to: ISODate): string | null;
/** Los últimos 24 meses, del más reciente al más antiguo: { value: "2026-10", label: "octubre 2026" }. */
function recentMonths(today: ISODate, count?: number): { value: string; label: string }[];
/** Lo que hay que pedir a la API: periodo de comparación + periodo + semana y mes en curso. */
function getReportFetchRange(period: ResolvedPeriod, today: ISODate): DateRange;

interface Comparison { delta: number | null; favorable: boolean | null }
/** delta: (actual − anterior) / anterior; null si anterior es 0. favorable según `better`. */
function compareValues(current: number, previous: number, better: "up" | "down"): Comparison;
```

Reglas: ver [research.md](../research.md) §2 (mes en curso = del 1 a hoy contra los mismos días del
mes anterior, recortado al último día de ese mes).

## `report-stats.ts` (cambios)

```ts
type VolumeGranularity = "day" | "week" | "month";
/** day ≤ 31 días < week ≤ 120 días < month. */
function volumeGranularity(range: DateRange): VolumeGranularity;
function getVolumeSeries(appointments: Appointment[], range: DateRange, granularity: VolumeGranularity): VolumePoint[];
/** Ocupación total de varias agendas: Σ minutos con citas / Σ minutos de horario; null sin horario. */
function getTotalOccupancy(rows: ProfessionalReport[], ...): number | null;
```

`getReportFetchRange` (versión antigua con `ReportPeriod`) se reemplaza por la de
`report-period.ts`.

## `report-insights.ts`

```ts
interface BookingChannels { total: number; fromPage: number; fromPanel: number; newFromPage: number }
function getBookingChannels(inRange: Appointment[], firstVisits: ReadonlyMap<string, ISODate | null>, range: DateRange): BookingChannels;

interface Heatmap { days: number[] /* 1 = lunes … 7 = domingo */; hours: number[]; counts: Map<string, number> /* "día-hora" */; max: number }
function getDemandHeatmap(inRange: Appointment[], schedules: Schedule[]): Heatmap;

interface ClientRank { clientId: string; appointments: number; completed: number; noShow: number; spent: number; attendance: number | null }
function getTopClients(inRange: Appointment[], limit?: number): ClientRank[];     // por citas no canceladas
function getMostNoShows(inRange: Appointment[], limit?: number): ClientRank[];    // noShow ≥ 1

/** Resumen por paciente que "no volvieron" necesita: el front lo arma desde clients/activity, la beta desde sus citas. */
interface ClientVisits { clientId: string; visits: number; lastVisit: ISODate | null; hasUpcoming: boolean; firstVisit: ISODate | null }
/** Sólo la beta: el resumen calculado con todas las citas (pasada = antes de ahora; próxima = pendiente/confirmada futura). */
function summarizeClientVisits(appointments: Appointment[], now: { date: ISODate; time: string }): ClientVisits[];

interface LapsedClient { clientId: string; lastVisit: ISODate; visits: number }
const LAPSED_THRESHOLDS = [30, 60, 90] as const;
function getLapsedClients(visits: ClientVisits[], activeClientIds: ReadonlySet<string>, today: ISODate, days: number): LapsedClient[];
```

## `whatsapp.ts` (nuevo mensaje)

```ts
/** "Hola Ana, hace tiempo que no te vemos en {negocio}. Cuando quieras agendar tu próxima cita, puedes elegir tu hora aquí: {enlace}" */
function buildWinBackMessage(data: { clientName: string; businessName: string; bookingUrl: string }): string;
```

## Componentes

| Componente | Props | Notas |
|---|---|---|
| `MetricStrip` (cambia) | `Metric.trend?: ReactNode` | Aditivo: el Inicio no lo usa y no cambia. |
| `Trend` | `comparison: Comparison; previousLabel: string` | "▲ 18 %" / "▼ 5 %" / "= igual" / "sin datos para comparar"; texto `sr-only` completo. |
| `PeriodPicker` | `value: ReportPeriodChoice; onChange; today` | Pestañas + selector de mes + dos fechas con error. `print:hidden`. |
| `DemandHeatmap` | `heatmap: Heatmap` | `<table>` con `<caption>`; números visibles; celdas con `color-mix` del primario. |
| `BookingChannelsCard` | `current, previous: BookingChannels; previousLabel` | Barras página/panel y nuevos por la página con tendencia. |
| `TopClientsCards` | `top, noShows: ClientRank[]; clientsById; currency` | Dos tarjetas; nombre con enlace a la ficha. |
| `LapsedClientsCard` | `visits: ClientVisits[], clientsById, business, today` | Umbral 30/60/90 (estado local); 10 en 10; WhatsApp `print:hidden`; impresión hasta 30. |
| `ReportPrintHeader` | `business, periodLabel, professionalName?` | `hidden print:flex`. |
