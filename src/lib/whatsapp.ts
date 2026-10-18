import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { BANK_ACCOUNT_TYPE_LABELS, TIMEZONES } from "@/lib/constants/business";
import { formatDate } from "@/lib/format";
import type { Appointment, AppointmentStatus, BankAccount, Business, ISODate, WhatsAppNoticeKind } from "@/types";

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

/** Enlace para compartir un mensaje por WhatsApp eligiendo a quién (sin número): «Compartir por WhatsApp». */
export function getShareWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
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

/**
 * Desde «Tu cita» (spec 010), el paciente avisa al negocio de que no podrá ir: fuera de plazo, si el
 * negocio no permite cancelar ahí o si es otra persona de la sesión. Sin su nombre: la página no lo
 * conoce (WhatsApp ya dice quién escribe).
 */
export function getCantAttendWhatsAppUrl(
  business: Pick<Business, "phone" | "timezone">,
  appointment: { serviceName: string; date: ISODate; startTime: string },
): string | null {
  if (!business.phone) return null;
  const when = `el ${formatDate(appointment.date, "EEEE d 'de' MMMM")} a las ${appointment.startTime}`;
  return getWhatsAppUrl(business.phone, business.timezone, `Hola, no podré ir a mi cita de ${appointment.serviceName} ${when}.`);
}

/**
 * Las cuentas de una agenda en un mensaje, una por línea ("Banco Pichincha · Ahorros · N.º 2200123456 ·
 * Titular: Ana Ruiz"), numeradas si son varias (el paciente transfiere a cualquiera).
 */
export function describeBankAccounts(accounts: BankAccount[]): string {
  const lines = accounts.map((account) =>
    [
      account.bank,
      BANK_ACCOUNT_TYPE_LABELS[account.accountType],
      `N.º ${account.number}`,
      `Titular: ${account.holder}`,
      ...(account.holderId ? [`Cédula/RUC: ${account.holderId}`] : []),
    ].join(" · "),
  );
  return lines.length === 1 ? lines[0] : lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

/**
 * Avisos que se proponen al cambiar una cita (todos quedan en la actividad); "pending" es el de una
 * cita cancelada que vuelve a quedar pendiente.
 */
export type AppointmentNoticeKind = WhatsAppNoticeKind;

/**
 * Aviso que corresponde a un cambio de estado (spec 008: todos se avisan). Pasar a "Pendiente" desde
 * Cancelada es "vuelve a estar agendada"; desde otro estado, "queda pendiente de confirmar".
 */
export function noticeForStatus(status: AppointmentStatus, previous?: AppointmentStatus): AppointmentNoticeKind | null {
  if (status === "pending") return previous === "cancelled" ? "pending" : previous ? "unconfirmed" : null;
  return status;
}

/** Lo que cambia de una cita al editarla o moverla, para elegir su aviso. */
type NoticeAppointment = Pick<
  Appointment,
  "status" | "date" | "startTime" | "serviceId" | "professionalId" | "isVirtual" | "homeVisit"
>;

/**
 * Aviso de una cita editada: el de su nuevo estado y, si el estado no lo tiene, el de "reprogramada"
 * cuando cambió la fecha, la hora, el servicio, el profesional o el lugar (virtual o a domicilio).
 */
export function noticeForChange(previous: NoticeAppointment, saved: NoticeAppointment): AppointmentNoticeKind | null {
  const statusNotice = previous.status !== saved.status ? noticeForStatus(saved.status, previous.status) : null;
  if (statusNotice || saved.status === "cancelled") return statusNotice;
  const changed =
    previous.date !== saved.date ||
    previous.startTime !== saved.startTime ||
    previous.serviceId !== saved.serviceId ||
    previous.professionalId !== saved.professionalId ||
    previous.isVirtual !== saved.isVirtual ||
    Boolean(previous.homeVisit) !== Boolean(saved.homeVisit);
  return changed ? "rescheduled" : null;
}

export interface AppointmentNoticeData {
  clientName: string;
  businessName: string;
  serviceName: string;
  date: ISODate;
  startTime: string;
  /** Página de reservas del negocio, para volver a agendar. */
  bookingUrl: string;
  /** Con quién es la cita, si el negocio tiene varias agendas. */
  professionalName?: string;
  /** Cita a domicilio. */
  homeVisit?: boolean;
  /** Cita por videollamada: su enlace (null: el profesional aún no lo configuró). */
  virtual?: { meetingUrl: string | null };
  /** Enlace de pago (la agenda cobra por transferencia y la cita aún no está pagada). */
  paymentUrl?: string;
  /** «Cancelar ésta y las siguientes» de una serie (spec 011): las fechas canceladas, en orden. */
  dates?: ISODate[];
}

/** "martes 20 de octubre, martes 27 de octubre y martes 3 de noviembre". */
const describeDates = (dates: ISODate[]) => {
  const days = dates.map((date) => formatDate(date, "EEEE d 'de' MMMM"));
  return days.length <= 1 ? (days[0] ?? "") : `${days.slice(0, -1).join(", ")} y ${days[days.length - 1]}`;
};

/** Para recuperar a un paciente que no ha vuelto (Reportes): se puede editar en WhatsApp antes de enviarlo. */
export function buildWinBackMessage(data: { clientName: string; businessName: string; bookingUrl: string }): string {
  const name = data.clientName.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hola ${name}` : "Hola";
  return `${hello}, hace tiempo que no te vemos en ${data.businessName}. Cuando quieras agendar tu próxima cita, puedes elegir tu hora aquí: ${data.bookingUrl}`;
}

/** Mensaje de WhatsApp al cliente según el cambio de su cita; el profesional lo revisa antes de enviarlo. */
export function buildAppointmentNotice(kind: AppointmentNoticeKind, data: AppointmentNoticeData): string {
  const name = data.clientName.trim().split(/\s+/)[0] ?? "";
  const hello = name ? `Hola ${name}` : "Hola";
  const when = `el ${formatDate(data.date, "EEEE d 'de' MMMM")} a las ${data.startTime}`;
  // Al reprogramarla: también con quién y dónde, por si eso es lo que cambió.
  const withWhom = data.professionalName ? ` con ${data.professionalName}` : "";
  const atHome = data.homeVisit ? ", a domicilio" : "";
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
      return `${hello}, cambiamos tu cita de ${data.serviceName} con ${data.businessName}: ahora es ${when}${withWhom}${atHome}.${videoCall} Si no te queda bien, respóndenos por aquí.${payment}`;
    case "pending":
      return `${hello}, tu cita de ${data.serviceName} ${when} con ${data.businessName} vuelve a estar agendada; te escribiremos para confirmarla.${videoCall}${payment}`;
    case "unconfirmed":
      return `${hello}, tu cita de ${data.serviceName} ${when} con ${data.businessName} queda pendiente de confirmar; te escribiremos para confirmarla.`;
    case "completed":
      return `${hello}, gracias por tu visita a ${data.businessName}. Cuando quieras volver, puedes reservar aquí: ${data.bookingUrl}`;
    case "no_show":
      return `${hello}, te esperábamos ${when} para tu cita de ${data.serviceName} con ${data.businessName}. ¿Quieres reagendarla? Puedes elegir otra hora aquí: ${data.bookingUrl}`;
    case "series_cancelled": {
      const dates = data.dates?.length ? data.dates : [data.date];
      return dates.length === 1
        ? `${hello}, tu cita de ${data.serviceName} con ${data.businessName} del ${describeDates(dates)} quedó cancelada. Si quieres agendar otra, puedes hacerlo aquí: ${data.bookingUrl}`
        : `${hello}, tus citas de ${data.serviceName} con ${data.businessName} del ${describeDates(dates)} quedaron canceladas. Si quieres agendar otras, puedes hacerlo aquí: ${data.bookingUrl}`;
    }
  }
}
