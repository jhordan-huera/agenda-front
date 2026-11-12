import type { SheetData } from "write-excel-file/browser";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { describeDayParts, describeWaitlistDays, SERVICE_MODES } from "@/lib/constants/business";
import { toZonedDate } from "@/lib/format";
import type { DataExportAppointment, DataExportClient, DataExportSurvey, DataExportWaitlistEntry, ISODate, WaitlistCloseReason } from "@/types";

/**
 * Los Excel de la descarga (spec 028): pacientes.xlsx y citas.xlsx. El escritor de Excel
 * (write-excel-file) se descarga sólo al armar el ZIP, como el lector en la importación.
 */

/**
 * Las columnas de pacientes.xlsx. Las seis primeras son las de la importación de pacientes, con títulos
 * que su `guessColumns` reconoce solos: el Excel se puede volver a subir sin tocar nada. Las demás las
 * deja en «No importar».
 */
export const CLIENT_IMPORT_HEADERS = ["Nombre", "Cédula", "Email", "Teléfono", "Dirección", "Notas"] as const;
export const CLIENT_SHEET_HEADERS = [...CLIENT_IMPORT_HEADERS, "Activo", "Por verificar", "Fecha de alta"] as const;

export const APPOINTMENT_SHEET_HEADERS = [
  "Fecha",
  "Inicio",
  "Fin",
  "Pacientes",
  "Servicio",
  "Profesional",
  "Estado",
  "Modalidad",
  "Dirección de la visita",
  "Precio",
  "Pagada",
  "Notas",
] as const;

const DATE_FORMAT = "dd/mm/yyyy";
const yesNo = (value: boolean) => (value ? "Sí" : "No");
const header = (titles: readonly string[]) => titles.map((title) => ({ value: title, fontWeight: "bold" as const }));
/** Un día como fecha de Excel (sin hora ni zona: medianoche en UTC, que es como la escribe). */
const excelDate = (iso: ISODate) => {
  const [year, month, day] = iso.split("-").map(Number);
  return { value: new Date(Date.UTC(year, month - 1, day)), type: Date, format: DATE_FORMAT };
};
/** Todo como texto: la cédula y el teléfono conservan su 0 inicial. */
const text = (value: string) => ({ value, type: String });

/** Las filas de pacientes.xlsx, por nombre. La fecha de alta, en la zona horaria del negocio. */
export function clientRows(clients: readonly DataExportClient[], timezone: string): SheetData {
  const rows = clients
    .toSorted((a, b) => a.name.localeCompare(b.name, "es"))
    .map((client) => [
      text(client.name),
      text(client.documentId),
      text(client.email),
      text(client.phone),
      text(client.address),
      text(client.notes),
      text(yesNo(client.isActive)),
      text(yesNo(client.pendingVerification)),
      excelDate(toZonedDate(client.createdAt, timezone)),
    ]);
  return [header(CLIENT_SHEET_HEADERS), ...rows];
}

const MODE_LABELS = Object.fromEntries(SERVICE_MODES.map((mode) => [mode.value, mode.label]));

/** Las filas de citas.xlsx, de la más antigua a la más reciente. */
export function appointmentRows(appointments: readonly DataExportAppointment[]): SheetData {
  const rows = appointments
    .toSorted((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .map((appointment) => [
      excelDate(appointment.date),
      text(appointment.startTime),
      text(appointment.endTime),
      text(appointment.clients.join(", ")),
      text(appointment.service),
      text(appointment.professional),
      text(APPOINTMENT_STATUS_CONFIG[appointment.status]?.label ?? appointment.status),
      text(MODE_LABELS[appointment.modality] ?? appointment.modality),
      text(appointment.homeAddress),
      { value: appointment.price, type: Number, format: "#,##0.00" },
      text(yesNo(appointment.paid)),
      text(appointment.notes),
    ]);
  return [header(APPOINTMENT_SHEET_HEADERS), ...rows];
}

/** Las columnas de lista-de-espera.xlsx (spec 047). */
export const WAITLIST_SHEET_HEADERS = [
  "Nombre",
  "Email",
  "Teléfono",
  "Servicio",
  "Profesional",
  "Días",
  "Horario",
  "Espera hasta",
  "Se anotó desde",
  "Se anotó el",
  "Salió el",
  "Por qué salió",
] as const;

const CLOSE_REASON_LABELS: Record<WaitlistCloseReason, string> = {
  booked: "Reservó",
  left: "Salió con su enlace",
  removed: "La quitó el equipo",
  scheduled: "La agendó el equipo",
  expired: "Pasó su fecha",
  inactive: "El servicio o el profesional ya no está",
};

/** Las filas de lista-de-espera.xlsx, de la más antigua a la más reciente. Las fechas de alta y salida, en la zona del negocio. */
export function waitlistRows(entries: readonly DataExportWaitlistEntry[], timezone: string): SheetData {
  const rows = entries
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((entry) => [
      text(entry.name),
      text(entry.email),
      text(entry.phone),
      text(entry.service),
      text(entry.professional || "Cualquiera"),
      text(describeWaitlistDays(entry.days)),
      text(describeDayParts(entry.dayParts)),
      excelDate(entry.until),
      text(entry.source === "booking_page" ? "La página de reservas" : "El panel"),
      excelDate(toZonedDate(entry.createdAt, timezone)),
      entry.closedAt ? excelDate(toZonedDate(entry.closedAt, timezone)) : text(""),
      text(entry.closedReason ? CLOSE_REASON_LABELS[entry.closedReason] : ""),
    ]);
  return [header(WAITLIST_SHEET_HEADERS), ...rows];
}

/** Las columnas de encuestas.xlsx (spec 048). */
export const SURVEY_SHEET_HEADERS = ["Fecha de la cita", "Paciente", "Profesional", "Servicio", "Estrellas", "Comentario", "Respondió el"] as const;

/** Las filas de encuestas.xlsx, de la cita más antigua a la más reciente. La fecha de la respuesta, en la zona del negocio. */
export function surveyRows(surveys: readonly DataExportSurvey[], timezone: string): SheetData {
  const rows = surveys
    .toSorted((a, b) => a.appointmentDate.localeCompare(b.appointmentDate) || a.answeredAt.localeCompare(b.answeredAt))
    .map((survey) => [
      excelDate(survey.appointmentDate),
      text(survey.client),
      text(survey.professional),
      text(survey.service),
      { value: survey.rating, type: Number },
      text(survey.comment),
      excelDate(toZonedDate(survey.answeredAt, timezone)),
    ]);
  return [header(SURVEY_SHEET_HEADERS), ...rows];
}

/** Ancho de cada columna, en caracteres. */
export const CLIENT_COLUMN_WIDTHS = [30, 14, 30, 16, 30, 40, 8, 13, 13];
export const APPOINTMENT_COLUMN_WIDTHS = [12, 8, 8, 32, 26, 24, 13, 13, 30, 10, 8, 40];
export const WAITLIST_COLUMN_WIDTHS = [30, 30, 16, 26, 24, 28, 22, 12, 22, 12, 12, 30];
export const SURVEY_COLUMN_WIDTHS = [14, 30, 24, 26, 10, 60, 14];

/** El archivo .xlsx de una hoja, con la fila de títulos fija. */
export async function xlsxFile(rows: SheetData, sheet: string, widths: readonly number[]): Promise<Uint8Array> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const blob = await writeXlsxFile(rows, { sheet, stickyRowsCount: 1, columns: widths.map((width) => ({ width })) }).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}
