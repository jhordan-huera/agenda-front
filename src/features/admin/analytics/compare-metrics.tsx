import type { ReactNode } from "react";
import { formatCurrency, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsRateKey, BusinessAnalytics, CategoryAnalytics, HealthGroup, ISODate } from "@/types";
import { daysSince } from "../sales-lists";
import {
  formatGrowth,
  formatRate,
  HEALTH_LABELS,
  lastAccessLabel,
  RATE_HINTS,
  RATE_LABELS,
  RATE_SHORT_LABELS,
  rateText,
  typicalRate,
  usageLabel,
} from "./analytics-format";
import { TypicalRate } from "./analytics-parts";

/**
 * Las cifras por las que se compara en «Comparar» (el ranking): qué número se ordena y se dibuja, cómo
 * se escribe, su dato secundario, su ayuda, si más es peor y su texto para el CSV.
 */

export interface CompareContext {
  category: (business: BusinessAnalytics) => CategoryAnalytics | null;
  today: ISODate;
}

export type MetricGroup = "Actividad" | "Calidad" | "Dinero" | "Cuenta";
export const METRIC_GROUPS: MetricGroup[] = ["Actividad", "Calidad", "Dinero", "Cuenta"];

/** Van en la dirección (`?cifra=`): por eso en español. */
export type MetricKey =
  | "citas"
  | "crecimiento"
  | "sin-cerrar"
  | "pacientes-activos"
  | "pacientes-nuevos"
  | "ultimo-acceso"
  | "online"
  | "inasistencias"
  | "cancelaciones"
  | "confirmo"
  | "ingresos"
  | "cobrado"
  | "porcentaje-cobrado"
  | "ticket"
  | "uso-del-plan"
  | "agendas"
  | "equipo"
  | "salud";

/**
 * Cómo se mide la barra:
 * - `rate`: una tasa, del 0 al 100 %;
 * - `max`: frente al mayor de los negocios que se ven, que ocupa todo el ancho;
 * - `share`: una parte (puede pasar del 100 %): del 0 al 100 %, o hasta el mayor si alguno pasa;
 * - `signed`: puede ser negativa (el crecimiento): las negativas van a la izquierda del cero;
 * - `score`: la salud, de 0 a 100.
 */
export type MetricScale = "rate" | "max" | "share" | "signed" | "score";

export type Direction = "asc" | "desc";

export interface Metric {
  key: MetricKey;
  label: string;
  group: MetricGroup;
  /** Qué mide (la ayuda de la cifra y del panel). */
  hint: string;
  /** Más es peor: la barra va en ámbar y la ayuda empieza por «Mayor es peor». */
  worse?: boolean;
  /** El número que se ordena y se dibuja; null («—», «Nuevo», «Sin tope», «Nadie»): al final y sin barra. */
  value: (business: BusinessAnalytics, ctx: CompareContext) => number | null;
  scale: MetricScale;
  /** La cifra ya escrita (también la de los nulos). */
  format: (business: BusinessAnalytics, ctx: CompareContext) => ReactNode;
  /** El dato secundario, pequeño, debajo de la cifra. */
  detail?: (business: BusinessAnalytics, ctx: CompareContext) => ReactNode;
  /** La cifra para el lector de pantalla: «103 citas». */
  spoken: (business: BusinessAnalytics, ctx: CompareContext) => string;
  /** El texto del CSV. */
  text: (business: BusinessAnalytics, ctx: CompareContext) => string;
  /** Sólo las tasas: la mediana de su tipo (la marca sobre la barra) y si es una tasa (con «pocos datos» atenuada y al final). */
  rateKey?: AnalyticsRateKey;
  /** El color de la barra, si no es el de la marca (o el ámbar de las que más es peor). */
  tone?: (business: BusinessAnalytics) => string | null;
}

const money = (business: BusinessAnalytics, amount: number | null) => (amount === null ? "—" : formatCurrency(amount, business.currency));

/** La parte de los ingresos estimados que ya está cobrada (null si no hubo ingresos). */
const collectedShare = ({ collected, estimatedRevenue }: BusinessAnalytics) => (estimatedRevenue > 0 ? collected / estimatedRevenue : null);

/** La parte del tope que usa (la mayor entre citas del mes y pacientes); null si su plan no tiene tope. */
function usageShare({ planUsage }: BusinessAnalytics): number | null {
  const shares = [planUsage.appointments, planUsage.clients].filter((use) => use.limit !== null).map((use) => use.used / use.limit!);
  return shares.length ? Math.max(...shares) : null;
}

function planUsageText(business: BusinessAnalytics): string {
  const { appointments, clients } = business.planUsage;
  if (appointments.limit === null && clients.limit === null) return "Sin tope";
  return `${usageLabel(appointments)} citas · ${usageLabel(clients)} pacientes`;
}

const agendasText = ({ agendas }: BusinessAnalytics) => (agendas.contracted === null ? String(agendas.active) : `${agendas.active} de ${agendas.contracted}`);
const teamText = (business: BusinessAnalytics) => usageLabel({ used: business.teamMembers, limit: business.planUsage.users.limit });

/** Sin datos de acceso en 90 días (la auditoría guarda 90): cuenta como lo más lejano, no como un nulo. */
const OVER_90_DAYS = 91;

/** Días desde el último acceso del equipo; null sin equipo («Nadie»). */
function daysWithoutAccess(business: BusinessAnalytics, today: ISODate): number | null {
  if (business.teamMembers === 0) return null;
  const days = daysSince(business.lastTeamLoginAt, today);
  return days === null || days > 90 ? OVER_90_DAYS : Math.max(days, 0);
}

const growthTone = (growth: number | "new") =>
  growth === "new" ? "text-muted-foreground" : growth > 0 ? "text-emerald-700 dark:text-emerald-300" : growth < 0 ? "text-rose-700 dark:text-rose-300" : "";

const usageTone = (share: number | null) =>
  share === null ? null : share >= 1 ? "bg-rose-500 dark:bg-rose-500/90" : share >= 0.8 ? "bg-amber-500 dark:bg-amber-500/90" : null;

/** La barra de la salud, del color de su grupo (el 500 se lee en los dos modos; en el oscuro, un poco más suave). */
const HEALTH_BAR: Record<HealthGroup, string> = {
  healthy: "bg-emerald-500 dark:bg-emerald-500/90",
  risk: "bg-amber-500 dark:bg-amber-500/90",
  critical: "bg-rose-500 dark:bg-rose-500/90",
};

const HEALTH_TEXT: Record<HealthGroup, string> = {
  healthy: "text-emerald-700 dark:text-emerald-300",
  risk: "text-amber-700 dark:text-amber-300",
  critical: "text-rose-700 dark:text-rose-300",
};

const count = (pick: (business: BusinessAnalytics) => number, one: string, many: string): Pick<Metric, "value" | "format" | "spoken" | "text"> => ({
  value: pick,
  format: (business) => pick(business),
  spoken: (business) => plural(pick(business), one, many),
  text: (business) => String(pick(business)),
});

const rateMetric = (rateKey: AnalyticsRateKey, key: MetricKey, worse = false): Metric => ({
  key,
  rateKey,
  label: RATE_SHORT_LABELS[rateKey],
  group: "Calidad",
  hint: RATE_HINTS[rateKey],
  worse,
  scale: "rate",
  value: (business) => business[rateKey],
  format: (business) => formatRate(business[rateKey]),
  detail: (business, ctx) => <TypicalRate business={business} rateKey={rateKey} category={ctx.category(business)} />,
  spoken: (business, ctx) => {
    const typical = typicalRate(business, rateKey, ctx.category(business));
    const value = business[rateKey] === null ? "sin dato" : formatRate(business[rateKey]);
    return `${RATE_LABELS[rateKey]}: ${value}${typical === null ? "" : `, su tipo ${formatRate(typical)}`}${business.fewData ? ", pocos datos" : ""}`;
  },
  text: (business, ctx) => rateText(business, rateKey, ctx.category(business)),
});

export const METRICS: Metric[] = [
  {
    key: "citas",
    label: "Citas",
    group: "Actividad",
    hint: "Citas con fecha en el periodo, sin las canceladas",
    scale: "max",
    ...count((business) => business.appointments, "cita", "citas"),
    detail: (business) => <span className={cn("font-semibold", growthTone(business.growth))}>{formatGrowth(business.growth)}</span>,
    spoken: (business) => `${plural(business.appointments, "cita", "citas")} (${formatGrowth(business.growth)} frente al periodo anterior)`,
  },
  {
    key: "crecimiento",
    label: "Crecimiento",
    group: "Actividad",
    hint: "Citas frente al periodo anterior de la misma duración. «Nuevo»: antes no tuvo citas",
    scale: "signed",
    value: (business) => (business.growth === "new" ? null : business.growth),
    format: (business) => <span className={growthTone(business.growth)}>{formatGrowth(business.growth)}</span>,
    detail: (business) => `antes ${business.previousAppointments}`,
    spoken: (business) => `${formatGrowth(business.growth)}, antes ${plural(business.previousAppointments, "cita", "citas")}`,
    text: (business) => formatGrowth(business.growth),
  },
  {
    key: "sin-cerrar",
    label: "Sin cerrar",
    group: "Actividad",
    hint: "Citas del periodo que ya pasaron y siguen Pendientes o Confirmadas: nadie marcó cómo terminaron",
    worse: true,
    scale: "max",
    ...count((business) => business.unclosed, "cita sin cerrar", "citas sin cerrar"),
    detail: (business) => `de ${plural(business.appointments, "cita", "citas")}`,
  },
  {
    key: "pacientes-activos",
    label: "Pacientes activos",
    group: "Actividad",
    hint: "Con alguna cita en el periodo",
    scale: "max",
    ...count((business) => business.activeClients, "paciente activo", "pacientes activos"),
  },
  {
    key: "pacientes-nuevos",
    label: "Pacientes nuevos",
    group: "Actividad",
    hint: "Registrados en el periodo (sin los importados)",
    scale: "max",
    ...count((business) => business.newClients, "paciente nuevo", "pacientes nuevos"),
  },
  {
    key: "ultimo-acceso",
    label: "Último acceso",
    group: "Actividad",
    hint: "Días desde la última vez que alguien del equipo inició sesión o usó el panel. «Hace más de 90 días» cuenta como lo más lejano",
    worse: true,
    scale: "max",
    value: (business, ctx) => daysWithoutAccess(business, ctx.today),
    format: (business, ctx) => lastAccessLabel(business, ctx.today),
    spoken: (business, ctx) => `último acceso: ${lastAccessLabel(business, ctx.today).toLowerCase()}`,
    text: (business, ctx) => lastAccessLabel(business, ctx.today),
  },
  rateMetric("onlineRate", "online"),
  rateMetric("noShowRate", "inasistencias", true),
  rateMetric("cancelRate", "cancelaciones", true),
  rateMetric("confirmRate", "confirmo"),
  {
    key: "ingresos",
    label: "Ingresos estimados",
    group: "Dinero",
    hint: "El precio de las citas atendidas",
    scale: "max",
    value: (business) => business.estimatedRevenue,
    format: (business) => money(business, business.estimatedRevenue),
    detail: (business) => `cobrado ${money(business, business.collected)}`,
    spoken: (business) => `${money(business, business.estimatedRevenue)} estimados, cobrado ${money(business, business.collected)}`,
    text: (business) => money(business, business.estimatedRevenue),
  },
  {
    key: "cobrado",
    label: "Cobrado",
    group: "Dinero",
    hint: "El precio de las citas marcadas como pagadas",
    scale: "max",
    value: (business) => business.collected,
    format: (business) => money(business, business.collected),
    detail: (business) => business.currency,
    spoken: (business) => `${money(business, business.collected)} cobrados`,
    text: (business) => money(business, business.collected),
  },
  {
    key: "porcentaje-cobrado",
    label: "% cobrado",
    group: "Dinero",
    hint: "Lo cobrado entre los ingresos estimados. Puede pasar del 100 % si se marcaron como pagadas citas que aún no se atienden; «—» si no hubo ingresos",
    scale: "share",
    value: collectedShare,
    format: (business) => formatRate(collectedShare(business)),
    detail: (business) => (business.estimatedRevenue > 0 ? `${money(business, business.collected)} de ${money(business, business.estimatedRevenue)}` : null),
    spoken: (business) => (collectedShare(business) === null ? "sin ingresos" : `${formatRate(collectedShare(business))} cobrado`),
    text: (business) => formatRate(collectedShare(business)),
  },
  {
    key: "ticket",
    label: "Ticket promedio",
    group: "Dinero",
    hint: "Ingresos estimados entre las atendidas con precio",
    scale: "max",
    value: (business) => business.averageTicket,
    format: (business) => money(business, business.averageTicket),
    detail: (business) => (business.averageTicket === null ? null : business.currency),
    spoken: (business) => (business.averageTicket === null ? "sin ticket promedio" : `ticket promedio ${money(business, business.averageTicket)}`),
    text: (business) => money(business, business.averageTicket),
  },
  {
    key: "uso-del-plan",
    label: "Uso del plan",
    group: "Cuenta",
    hint: "La parte del tope del plan que usa: la mayor entre las citas del mes y los pacientes. «Sin tope» si su plan no tiene",
    scale: "share",
    value: usageShare,
    format: (business) => {
      const share = usageShare(business);
      return share === null ? "Sin tope" : formatRate(share);
    },
    detail: (business) => (usageShare(business) === null ? null : planUsageText(business)),
    spoken: (business) => (usageShare(business) === null ? "sin tope" : `usa el ${formatRate(usageShare(business))} de su tope: ${planUsageText(business)}`),
    text: planUsageText,
    tone: (business) => usageTone(usageShare(business)),
  },
  {
    key: "agendas",
    label: "Agendas",
    group: "Cuenta",
    hint: "Profesionales activos y, en Business, las agendas contratadas",
    scale: "max",
    ...count((business) => business.agendas.active, "agenda", "agendas"),
    detail: (business) => (business.agendas.contracted === null ? null : `de ${business.agendas.contracted} contratadas`),
    text: agendasText,
  },
  {
    key: "equipo",
    label: "Equipo",
    group: "Cuenta",
    hint: "Personas del equipo con acceso al panel, con el propietario, frente a los usuarios que permite su plan",
    scale: "max",
    ...count((business) => business.teamMembers, "persona", "personas"),
    detail: (business) => (business.planUsage.users.limit === null ? "sin tope" : `de ${business.planUsage.users.limit} en su plan`),
    text: teamText,
  },
  {
    key: "salud",
    label: "Salud",
    group: "Cuenta",
    hint: "De 0 a 100: sano (70 o más), en riesgo (de 40 a 69) o crítico (menos de 40). Sus motivos, al tocar el negocio",
    scale: "score",
    value: (business) => business.health.score,
    format: (business) => business.health.score,
    detail: (business) => <span className={cn("font-semibold", HEALTH_TEXT[business.health.group])}>{HEALTH_LABELS[business.health.group]}</span>,
    spoken: (business) => `salud ${business.health.score} de 100, ${HEALTH_LABELS[business.health.group].toLowerCase()}`,
    text: (business) => `${business.health.score} · ${HEALTH_LABELS[business.health.group]}`,
    tone: (business) => HEALTH_BAR[business.health.group],
  },
];

export const DEFAULT_METRIC: MetricKey = "citas";

/** La ayuda de una cifra: en las que más es peor, empieza por «Mayor es peor». */
export const helpOf = (metric: Metric) => (metric.worse ? `Mayor es peor. ${metric.hint}` : metric.hint);

export const metricOf = (key: MetricKey) => METRICS.find((metric) => metric.key === key)!;

export const isMetricKey = (value: string | null): value is MetricKey => METRICS.some((metric) => metric.key === value);

/** El CSV lleva todas las cifras, sea cual sea la elegida, en este orden (el de la tabla de antes). */
export const CSV_METRICS: MetricKey[] = [
  "citas",
  "crecimiento",
  "sin-cerrar",
  "online",
  "inasistencias",
  "cancelaciones",
  "confirmo",
  "pacientes-activos",
  "pacientes-nuevos",
  "ingresos",
  "cobrado",
  "porcentaje-cobrado",
  "ticket",
  "uso-del-plan",
  "agendas",
  "equipo",
  "ultimo-acceso",
  "salud",
];

/** Ordena por la cifra; los nulos al final y, en las tasas, también los de «pocos datos». */
export function rankRows(rows: BusinessAnalytics[], metric: Metric, direction: Direction, ctx: CompareContext): BusinessAnalytics[] {
  return [...rows].sort((a, b) => {
    if (metric.rateKey && a.fewData !== b.fewData) return a.fewData ? 1 : -1;
    const x = metric.value(a, ctx);
    const y = metric.value(b, ctx);
    if (x === null || y === null) return x === y ? a.name.localeCompare(b.name, "es") : x === null ? 1 : -1;
    return (direction === "asc" ? x - y : y - x) || a.name.localeCompare(b.name, "es");
  });
}

/** Dónde empieza y cuánto ocupa una barra (en partes del ancho, de 0 a 1), y dónde va el cero si hay negativas. */
export interface BarGeometry {
  start: number;
  size: number;
}

/** La escala de la barra para los negocios que se ven: el mayor (o el 100 %) ocupa todo el ancho. */
export function barScale(metric: Metric, rows: BusinessAnalytics[], ctx: CompareContext) {
  const values = rows.map((business) => metric.value(business, ctx)).filter((value): value is number => value !== null);
  const highest = Math.max(0, ...values);
  const lowest = Math.min(0, ...values);
  const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
  if (metric.scale === "signed") {
    const range = highest - lowest || 1;
    const zero = -lowest / range;
    return {
      zero: lowest < 0 ? zero : null,
      bar: (value: number): BarGeometry => ({ start: value < 0 ? zero + value / range : zero, size: Math.abs(value) / range }),
    };
  }
  const top = metric.scale === "rate" ? 1 : metric.scale === "score" ? 100 : metric.scale === "share" ? Math.max(1, highest) : highest || 1;
  return { zero: null, bar: (value: number): BarGeometry => ({ start: 0, size: clamp(value / top) }) };
}
