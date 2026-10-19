import type { DatabaseSectionError, DatabaseWorker } from "@/types";
import { formatCount } from "../analytics/analytics-format";

/**
 * Textos y formatos de la pantalla «Base de datos» (spec 024). Las cifras llegan calculadas de la API:
 * aquí sólo se muestran.
 */

export { formatCount };

/** La sección no se pudo leer (tardó más de 5 segundos o falló): `{ error }`. */
export const isSectionError = (section: unknown): section is DatabaseSectionError =>
  typeof section === "object" && section !== null && "error" in section;

/** Como la tarjeta de Salud: en ámbar desde el 70 % del tope y en rojo desde el 90 %. */
export const WARN_SHARE = 0.7;
export const BAD_SHARE = 0.9;
/** Los días de historial que hacen falta para la proyección (como la API). */
export const PROJECTION_MIN_DAYS = 7;

export type Level = "ok" | "warn" | "bad";

export const levelOf = (share: number): Level => (share >= BAD_SHARE ? "bad" : share >= WARN_SHARE ? "warn" : "ok");

/** «Bien», «Atención» o «Alto», con su color (siempre con ícono y texto). */
export const LEVEL_LABELS: Record<Level, string> = { ok: "Bien", warn: "Atención", bad: "Alto" };

/** «16,2 MB», «840 KB», «1 GB» (sin «,0»). */
export function formatBytes(bytes: number): string {
  const kb = bytes / 1024;
  if (kb < 1024) return `${formatCount(Math.max(bytes > 0 ? 1 : 0, Math.round(kb)))} KB`;
  const oneDecimal = (value: number) => value.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  const mb = kb / 1024;
  return mb < 1024 ? `${oneDecimal(mb)} MB` : `${oneDecimal(mb / 1024)} GB`;
}

/** «32 %»; lo que no llega al 1 %, «menos del 1 %». */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.01) return "menos del 1 %";
  return `${Math.round(share * 100)} %`;
}

/** «850 ms», «12 s», «3 min 20 s», «2 h 5 min». */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms < 10 ? ms.toFixed(1).replace(".", ",") : Math.round(ms)} ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

/** Los meses de la proyección: «menos de un mes», «unos 8 meses», «unos 3 años». */
export function formatMonths(months: number): string {
  if (months < 1) return "menos de un mes";
  if (months < 1.5) return "un mes";
  if (months < 24) return `unos ${Math.round(months)} meses`;
  return `unos ${Math.round(months / 12)} años`;
}

/** Quién hace trabajar a la base (como en la API). */
export const WORKER_LABELS: Record<DatabaseWorker, string> = {
  app: "La app (la API)",
  cron: "El cron",
  pooler: "Las conexiones (el pooler)",
  supabase: "Supabase",
  other: "Otras cuentas",
};

/** El estado de una conexión de pg_stat_activity, en palabras. */
const CONNECTION_STATES: Record<string, string> = {
  active: "Trabajando",
  idle: "Esperando",
  "idle in transaction": "En una transacción, esperando",
  "idle in transaction (aborted)": "En una transacción que falló",
  "fastpath function call": "Trabajando",
  disabled: "Sin datos",
  unknown: "Sin permiso para verlo",
};

export const connectionStateLabel = (state: string) => CONNECTION_STATES[state] ?? state;
