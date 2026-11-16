import { priceAfterReward } from "@/lib/constants/loyalty";
import { formatCurrency, formatDayMonth } from "@/lib/format";
import type { LoyaltyBenefitKind, LoyaltyReward, LoyaltyRewardStatus } from "@/types";

/*
 * Los textos de la tarjeta de fidelización en el panel (spec 052): la ficha, la cita, «Fidelización» y el canje. Sin
 * React, para que `npm run check:loyalty` los compruebe.
 */

export const REWARD_STATUS_LABELS: Record<LoyaltyRewardStatus, string> = {
  available: "Disponible",
  redeemed: "Canjeada",
  expired: "Vencida",
  voided: "Anulada",
};

/** Los filtros de estado de «Recompensas». */
export const REWARD_STATUS_FILTERS: readonly { value: LoyaltyRewardStatus; label: string }[] = [
  { value: "available", label: "Disponibles" },
  { value: "redeemed", label: "Canjeadas" },
  { value: "expired", label: "Vencidas" },
  { value: "voided", label: "Anuladas" },
];

export const stampsLabel = (stamps: number) => (stamps === 1 ? "1 sello" : `${stamps} sellos`);

/** «Le falta 1 cita», «Le faltan 3 citas». */
export const describeMissing = (missing: number) => (missing === 1 ? "Le falta 1 cita" : `Le faltan ${missing} citas`);

/** «1 premio disponible», «2 premios disponibles». */
export const availableLabel = (count: number) => (count === 1 ? "1 premio disponible" : `${count} premios disponibles`);

/**
 * Las casillas del bloque de la ficha: hasta el próximo premio (sin él, las que ya lleva), con las ganadas llenas.
 * null si son más de `max`: entonces se muestra una barra.
 */
export function progressSlots(stamps: number, next: { visitsRequired: number } | null, max = 10): { slots: number; filled: number } | null {
  const slots = Math.max(next?.visitsRequired ?? stamps, stamps);
  if (slots === 0 || slots > max) return null;
  return { slots, filled: Math.min(stamps, slots) };
}

/** La línea de una recompensa según su estado: hasta cuándo vale, cuándo y quién la canjeó, o por qué se anuló. */
export function rewardDetail(
  reward: Pick<LoyaltyReward, "status" | "expiresAt" | "redeemedAt" | "redeemedByName" | "voidedAt" | "voidedReason">,
  timezone: string,
): string {
  const day = (iso: string) => formatDayMonth(iso, timezone);
  switch (reward.status) {
    case "available":
      return reward.expiresAt ? `Vence el ${day(reward.expiresAt)}` : "No vence";
    case "redeemed":
      return `Canjeada${reward.redeemedAt ? ` el ${day(reward.redeemedAt)}` : ""}${reward.redeemedByName ? ` por ${reward.redeemedByName}` : ""}`;
    case "expired":
      return reward.expiresAt ? `Venció el ${day(reward.expiresAt)}` : "Venció";
    case "voided":
      return `Anulada${reward.voidedAt ? ` el ${day(reward.voidedAt)}` : ""}${reward.voidedReason ? `: ${reward.voidedReason}` : ""}`;
  }
}

/** Las disponibles primero; después, de la más reciente a la más antigua. */
export function sortRewards<T extends Pick<LoyaltyReward, "status" | "unlockedAt">>(rewards: readonly T[]): T[] {
  return [...rewards].sort(
    (a, b) => Number(b.status === "available") - Number(a.status === "available") || b.unlockedAt.localeCompare(a.unlockedAt),
  );
}

/**
 * Qué pasa con el precio al canjear (spec 052): en una cita sin pagar, el porcentaje o el valor fijo lo bajan y la
 * cita o el servicio gratis lo dejan en $0; «Personalizado», una cita pagada o «Sin cita» no lo cambian.
 */
export function redeemPriceNote(
  reward: { kind: LoyaltyBenefitKind; value: number | null },
  appointment: { price: number; paid: boolean } | null,
  currency?: string,
): string {
  if (!appointment) return "No cambia el precio de ninguna cita.";
  if (reward.kind === "custom") return "Este beneficio no cambia el precio de la cita.";
  if (appointment.paid) return "Esa cita ya está pagada: su precio no cambia.";
  const after = priceAfterReward(appointment.price, reward.kind, reward.value);
  if (after === appointment.price) return "El precio de la cita no cambia.";
  return `El precio de la cita baja de ${formatCurrency(appointment.price, currency)} a ${formatCurrency(after, currency)}.`;
}
