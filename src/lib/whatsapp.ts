import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { TIMEZONES } from "@/lib/constants/business";
import { formatDate } from "@/lib/format";
import type { AppointmentStatus, Business, ISODate, WhatsAppNoticeKind } from "@/types";

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

/**
 * El paciente avisa al negocio de su transferencia; la foto del comprobante la adjunta él en
 * WhatsApp (un enlace wa.me no puede llevar archivos).
 */
export function getReceiptWhatsAppUrl(
  business: Pick<Business, "phone" | "timezone">,
  appointment: { clientName: string; serviceName: string; date: ISODate; startTime: string },
): string | null {
  if (!business.phone) return null;
  const who = appointment.clientName ? `, soy ${appointment.clientName}` : "";
  const when = `el ${formatDate(appointment.date, "EEEE d 'de' MMMM")} a las ${appointment.startTime}`;
  return getWhatsAppUrl(
    business.phone,
    business.timezone,
    `Hola${who}. Te envío el comprobante de la transferencia de mi cita de ${appointment.serviceName} ${when}.`,
  );
}

/** Aviso que corresponde a un cambio de estado (pasar a "Pendiente" no tiene aviso). */
export function noticeForStatus(status: AppointmentStatus): WhatsAppNoticeKind | null {
  return status === "pending" ? null : status;
}

export interface AppointmentNoticeData {
  clientName: string;
  businessName: string;
  serviceName: string;
  date: ISODate;
  startTime: string;
  /** Página de reservas del negocio, para volver a agendar. */
  bookingUrl: string;
  /** Cita por videollamada: su enlace (null: el profesional aún no lo configuró). */
  virtual?: { meetingUrl: string | null };
  /** Enlace de pago (la agenda cobra por transferencia y la cita aún no está pagada). */
  paymentUrl?: string;
}

/** Mensaje de WhatsApp al cliente según el cambio de su cita; el profesional lo revisa antes de enviarlo. */
export function buildAppointmentNotice(kind: WhatsAppNoticeKind, data: AppointmentNoticeData): string {
  const name = data.clientName.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hola ${name}` : "Hola";
  const when = `el ${formatDate(data.date, "EEEE d 'de' MMMM")} a las ${data.startTime}`;
  const videoCall = data.virtual
    ? data.virtual.meetingUrl
      ? ` Es por videollamada: ${data.virtual.meetingUrl}`
      : " Es por videollamada: te enviaremos el enlace antes de la cita."
    : "";
  const payment = data.paymentUrl ? ` Para pagar por transferencia y enviarnos el comprobante: ${data.paymentUrl}` : "";
  switch (kind) {
    case "confirmed":
      return data.virtual
        ? `${hello}, te confirmamos tu cita de ${data.serviceName} ${when} con ${data.businessName}.${videoCall}${payment}`
        : `${hello}, te confirmamos tu cita de ${data.serviceName} ${when} con ${data.businessName}. ¡Te esperamos!${payment}`;
    case "cancelled":
      return `${hello}, tu cita de ${data.serviceName} ${when} con ${data.businessName} quedó cancelada. Si quieres agendar otra, puedes hacerlo aquí: ${data.bookingUrl}`;
    case "rescheduled":
      return `${hello}, cambiamos tu cita de ${data.serviceName} con ${data.businessName}: ahora es ${when}.${videoCall} Si no te queda bien, respóndenos por aquí.${payment}`;
    case "completed":
      return `${hello}, gracias por tu visita a ${data.businessName}. Cuando quieras volver, puedes reservar aquí: ${data.bookingUrl}`;
    case "no_show":
      return `${hello}, te esperábamos ${when} para tu cita de ${data.serviceName} con ${data.businessName}. ¿Quieres reagendarla? Puedes elegir otra hora aquí: ${data.bookingUrl}`;
  }
}
