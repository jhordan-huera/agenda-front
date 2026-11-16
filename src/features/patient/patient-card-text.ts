import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { formatDate, plural, toZonedDate } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import type { PatientCard } from "@/types";

/*
 * La tarjeta del paciente (spec 052, diseño B «Tarjeta clara»): las casillas y los textos que salen de los sellos.
 * Sin React, para poder probarlas aparte.
 */

/** Una casilla de la tarjeta: la cita número `number`, si ya tiene su sello y si es la de un premio. */
export interface CardSlot {
  number: number;
  stamped: boolean;
  /** La casilla de un beneficio: «gift» o, en la del último, «star»; null en las demás. */
  prize: "gift" | "star" | null;
}

type CardProgress = Pick<PatientCard, "slots" | "stamps" | "benefits" | "next">;

/**
 * Las casillas: una por cita hasta el último beneficio (`card.slots`). Las primeras `stamps` llevan el sello; con la
 * tarjeta que sigue sumando (más sellos que casillas), todas.
 */
export function cardSlots(card: Pick<PatientCard, "slots" | "stamps" | "benefits">): CardSlot[] {
  const prizes = new Set(card.benefits.map((benefit) => benefit.visitsRequired));
  const last = Math.max(0, ...prizes);
  const stamped = Math.min(card.stamps, card.slots);
  return Array.from({ length: card.slots }, (_, index) => {
    const number = index + 1;
    return { number, stamped: number <= stamped, prize: !prizes.has(number) ? null : number === last ? "star" : "gift" };
  });
}

/** El nombre de pila para saludar. */
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** «Llevas 7 de 10 sellos en Club Sonrisa.»; con la tarjeta llena, el total. */
export function stampsSummary(card: Pick<PatientCard, "slots" | "stamps" | "program">): string {
  if (card.stamps === 0) return `Todavía no tienes sellos en ${card.program.name}: cada cita atendida suma uno.`;
  if (card.stamps >= card.slots) return `Llevas ${plural(card.stamps, "sello", "sellos")} en ${card.program.name}.`;
  return `Llevas ${card.stamps} de ${card.slots} sellos en ${card.program.name}.`;
}

/** «Te faltan 3 citas para Blanqueamiento gratis.» */
export function nextPrizeText(card: CardProgress): string {
  if (card.next) return `Te faltan ${plural(card.next.missing, "cita", "citas")} para ${card.next.name}.`;
  if (card.benefits.length === 0) return "Todavía no hay premios en esta tarjeta.";
  if (card.stamps > card.slots) return "Ganaste todos los premios de esta tarjeta y sigues sumando sellos.";
  return "Ganaste todos los premios de esta tarjeta.";
}

/** «2 de diciembre» (con el año si no es este) de un instante, en la zona horaria del consultorio. */
export function dayOf(iso: string, timezone: string = DEFAULT_TIMEZONE): string {
  const date = toZonedDate(iso, timezone);
  const thisYear = getZonedNow(timezone).date.slice(0, 4);
  return formatDate(date, date.startsWith(thisYear) ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy");
}
