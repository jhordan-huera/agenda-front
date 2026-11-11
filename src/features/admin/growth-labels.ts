import { formatDate } from "@/lib/format";
import type { ISODate, PlatformStats } from "@/types";

/** Las cuatro tarjetas de «Crecimiento del mes» (spec 006); cada una abre su detalle (spec 042). */
export type GrowthMetric = keyof Pick<PlatformStats["growth"], "appointments" | "onlineBookings" | "newClients" | "newBusinesses">;

export const GROWTH_METRICS: { key: GrowthMetric; label: string }[] = [
  { key: "appointments", label: "Citas agendadas" },
  { key: "onlineBookings", label: "Reservas online" },
  { key: "newClients", label: "Pacientes nuevos" },
  { key: "newBusinesses", label: "Negocios nuevos" },
];

/**
 * El periodo, para leerlo después de "frente a": "el 1–13 de septiembre", "el 1 de octubre" o
 * "todo febrero" (cuando el mes pasado fue más corto y se compara entero).
 */
export function periodLabel(from: ISODate, to: ISODate): string {
  const month = formatDate(from, "MMMM");
  if (from.slice(0, 7) !== to.slice(0, 7)) return `todo ${month}`;
  const first = Number(from.slice(8));
  const last = Number(to.slice(8));
  return first === last ? `el ${first} de ${month}` : `el ${first}–${last} de ${month}`;
}

/** "Del 1 al 13 de octubre" o "El 1 de octubre". */
export function currentLabel(from: ISODate, to: ISODate): string {
  const first = Number(from.slice(8));
  const last = Number(to.slice(8));
  return first === last ? `El ${first} de ${formatDate(from, "MMMM")}` : `Del ${first} al ${last} de ${formatDate(from, "MMMM")}`;
}
