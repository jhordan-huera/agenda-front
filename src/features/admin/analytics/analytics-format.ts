import { formatClockTime, formatShortDate, toZonedDate } from "@/lib/format";
import type {
  AnalyticsRateKey,
  AnalyticsSnapshot,
  BusinessAnalytics,
  CategoryAnalytics,
  DayOfWeek,
  FeatureKey,
  HealthGroup,
  ISODate,
  VersusType,
} from "@/types";
import { daysSince } from "../sales-lists";

/**
 * Textos y formatos de la analítica del super admin (spec 016). Las cifras llegan ya calculadas en la
 * foto del día (la prepara el cron): aquí sólo se muestran.
 */

export const RATE_KEYS: AnalyticsRateKey[] = ["onlineRate", "noShowRate", "cancelRate", "confirmRate"];

export const RATE_LABELS: Record<AnalyticsRateKey, string> = {
  onlineRate: "Reservas online",
  noShowRate: "Inasistencias",
  cancelRate: "Cancelaciones",
  confirmRate: "Confirmadas por el paciente",
};

/** Columnas cortas de la tabla. */
export const RATE_SHORT_LABELS: Record<AnalyticsRateKey, string> = {
  onlineRate: "% online",
  noShowRate: "% inasistencias",
  cancelRate: "% cancelaciones",
  confirmRate: "% confirmó el paciente",
};

/**
 * Qué mide cada tasa (la ayuda del título de su columna). La de confirmaciones no es el estado
 * «Confirmada» que pone el negocio: es el botón «Confirmo que voy» del paciente (spec 010).
 */
export const RATE_HINTS: Record<AnalyticsRateKey, string> = {
  onlineRate: "Reservas hechas desde la página de reservas, entre las citas del periodo",
  noShowRate: "«No asistió» entre las citas ya cerradas (completadas y no asistió); las que siguen sin cerrar no cuentan",
  cancelRate: "Canceladas entre todas las citas del periodo",
  confirmRate:
    "Pacientes que pulsaron «Confirmo que voy» en el email o el recordatorio, entre las citas que lo recibieron. No es el estado «Confirmada» de la agenda",
};

/** Subir la tasa es bueno (reservas online, confirmaciones) o malo (inasistencias, cancelaciones). */
const HIGHER_IS_BETTER: Record<AnalyticsRateKey, boolean> = {
  onlineRate: true,
  noShowRate: false,
  cancelRate: false,
  confirmRate: true,
};

export const FEATURE_KEYS: FeatureKey[] = [
  "bookingPage",
  "reminders",
  "patientConfirm",
  "series",
  "clientImport",
  "push",
  "bell",
  "clinical",
  "payments",
  "multiAgenda",
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  bookingPage: "Página de reservas",
  reminders: "Recordatorios",
  patientConfirm: "«Confirmo que voy»",
  series: "Citas que se repiten",
  clientImport: "Importar pacientes",
  push: "Avisos en el celular",
  bell: "Campana",
  clinical: "Historia clínica",
  payments: "Pagos por transferencia",
  multiAgenda: "Varias agendas",
};

/** Qué cuenta como uso de cada función en el periodo (R6), para la ayuda de la tabla. */
export const FEATURE_HINTS: Record<FeatureKey, string> = {
  bookingPage: "Alguna reserva desde su página",
  reminders: "Algún recordatorio enviado",
  patientConfirm: "Algún paciente confirmó que va",
  series: "Agendó alguna serie de citas",
  clientImport: "Importó pacientes alguna vez",
  push: "El propietario tiene un aparato con avisos",
  bell: "Alguien del equipo leyó un aviso",
  clinical: "Registró alguna evolución",
  payments: "Alguna cita pagada o con comprobante",
  multiAgenda: "Más de un profesional activo",
};

export const HEALTH_LABELS: Record<HealthGroup, string> = { healthy: "Sano", risk: "En riesgo", critical: "Crítico" };

/** Colores de estado (siempre con su texto al lado). */
export const HEALTH_TONES: Record<HealthGroup, string> = {
  healthy: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40",
  risk: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40",
  critical: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/40",
};

const DAY_NAMES: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};
export const dayName = (day: DayOfWeek) => DAY_NAMES[day];
export const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

/** «1.240»: con punto de miles también en cifras de cuatro dígitos (como en el pedido del dueño). */
export const formatCount = (value: number) => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** «25 %» (null: «—»). */
export const formatRate = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)} %`);

/** «+45 %», «−40 %», «0 %» o «Nuevo». */
export function formatGrowth(growth: number | "new"): string {
  if (growth === "new") return "Nuevo";
  const percent = Math.round(growth * 100);
  return percent === 0 ? "0 %" : `${percent > 0 ? "+" : "−"}${Math.abs(percent)} %`;
}

/** Una tasa frente a su tipo: buena, mala o sin resaltar (parecida o sin comparación). */
export function versusTone(key: AnalyticsRateKey, versus: VersusType): "good" | "bad" | null {
  if (versus !== "above" && versus !== "below") return null;
  return (versus === "above") === HIGHER_IS_BETTER[key] ? "good" : "bad";
}

/** «Hoy», «Ayer», «Hace 5 días», «Hace más de 90 días» (la auditoría guarda 90) o «Nadie» (sin equipo). */
export function lastAccessLabel(business: Pick<BusinessAnalytics, "lastTeamLoginAt" | "teamMembers">, today: ISODate): string {
  if (business.teamMembers === 0) return "Nadie";
  const days = daysSince(business.lastTeamLoginAt, today);
  if (days === null) return "Hace más de 90 días";
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

/** «Datos de hoy a las 06:12», «Datos de ayer a las 06:12» o «Datos del jue 9 oct a las 06:12». */
export function computedLabel(iso: string, today: ISODate): string {
  const days = daysSince(iso, today) ?? 0;
  const when = days <= 0 ? "de hoy" : days === 1 ? "de ayer" : `del ${formatShortDate(toZonedDate(iso))}`;
  return `Datos ${when} a las ${formatClockTime(iso)}`;
}

/** El tipo de un negocio en la foto (null si no está, p. ej. un tipo sólo con suspendidos). */
export function categoryOf(snapshot: Pick<AnalyticsSnapshot, "categories">, business: BusinessAnalytics): CategoryAnalytics | null {
  return snapshot.categories.find((category) => category.id === business.category.id) ?? null;
}

/** La mediana del tipo para una tasa (null con «pocos datos», del negocio o del tipo: no se comparan). */
export const typicalRate = (business: BusinessAnalytics, rateKey: AnalyticsRateKey, category: CategoryAnalytics | null) =>
  !business.fewData && category && !category.fewData ? category.medians[rateKey] : null;

/** «45 de 50» o «Sin tope». */
export const usageLabel = ({ used, limit }: { used: number; limit: number | null }) => (limit === null ? String(used) : `${used} de ${limit}`);

/** Texto de una tasa para el CSV: «25 % · tipo 12 %» o «40 % · pocos datos». */
export function rateText(business: BusinessAnalytics, rateKey: AnalyticsRateKey, category: CategoryAnalytics | null): string {
  const typical = typicalRate(business, rateKey, category);
  if (business.fewData) return `${formatRate(business[rateKey])} · pocos datos`;
  return typical === null ? formatRate(business[rateKey]) : `${formatRate(business[rateKey])} · tipo ${formatRate(typical)}`;
}
