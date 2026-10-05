import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { TIMEZONES } from "@/lib/constants/business";
import type { Business } from "@/types";

/**
 * Enlaces "click to chat" de WhatsApp (https://wa.me): abren la conversación con el
 * mensaje escrito en la app o en WhatsApp Web. No usan la API de WhatsApp Business:
 * no tienen coste ni requieren integración; el envío lo hace la persona.
 */

/**
 * Número en formato internacional sólo con dígitos ("593987654321").
 * Los números guardados sin prefijo ("098 765 4321") toman el del país del negocio.
 */
export function toWhatsAppNumber(phone: string, timezone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);

  const callingCode = TIMEZONES.find((zone) => zone.value === timezone)?.callingCode;
  if (!callingCode || digits.startsWith(callingCode)) return digits;
  return callingCode + digits.replace(/^0+/, "");
}

export function getWhatsAppUrl(phone: string, timezone: string, message: string): string | null {
  const number = toWhatsAppNumber(phone, timezone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

/** Enlace al WhatsApp de soporte de la plataforma (números sin prefijo: Ecuador). */
export function getSupportWhatsAppUrl(phone: string, message: string): string | null {
  return getWhatsAppUrl(phone, DEFAULT_TIMEZONE, message);
}

/** Enlace para que un cliente escriba al negocio desde la página pública de reservas. */
export function getBusinessWhatsAppUrl(business: Pick<Business, "name" | "phone" | "timezone">): string | null {
  return business.phone
    ? getWhatsAppUrl(business.phone, business.timezone, `Hola, quisiera ayuda para agendar una cita en ${business.name}.`)
    : null;
}
