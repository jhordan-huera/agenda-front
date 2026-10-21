import { data, DataError } from "@/lib/data";
import { toZonedDate } from "@/lib/format";
import type {
  DataExportAppointment,
  DataExportClient,
  DataExportClinicalPage,
  DataExportClinicalRecord,
  DataExportPage,
  DataExportSummary,
} from "@/types";
import { clinicalRecordHtml } from "./clinical-html";
import { patientFileName, safeFileName, splitExtension, uniqueNames } from "./file-names";
import { readmeHtml } from "./readme-html";
import { APPOINTMENT_COLUMN_WIDTHS, appointmentRows, CLIENT_COLUMN_WIDTHS, clientRows, xlsxFile } from "./sheets";

/**
 * Descargar los datos del negocio (spec 028): el ZIP se arma en el navegador. La API entrega los datos
 * por partes (pacientes, citas e historias) y un enlace de unos minutos para cada archivo adjunto; aquí
 * se escriben los Excel y las páginas, se meten los archivos y se descarga
 * `agenda360-<negocio>-<AAAA-MM-DD>.zip`. En el servidor no queda nada a medias si se cierra la página.
 * fflate y write-excel-file se descargan sólo al tocar «Descargar».
 */

export type ExportStep = "summary" | "clients" | "appointments" | "clinical" | "zip";
type Counts = DataExportSummary["counts"];

export interface ExportProgress {
  step: ExportStep;
  /** Lo que trae la descarga (null hasta tener el resumen). */
  total: Counts | null;
  done: Counts;
}

export interface ExportResult {
  file: Blob;
  fileName: string;
  /** Los archivos adjuntos que no se pudieron incluir (el LEEME dice cuáles). */
  missingFiles: number;
}

/** Cada parte que falla por la red o el servidor se reintenta así (en ms) antes de dar error. */
const RETRY_DELAYS = [1000, 3000];
/** Tiempo máximo para bajar un archivo adjunto (hasta 15 MB). */
const FILE_TIMEOUT_MS = 3 * 60_000;
/** Cada tanto se pasa lo ya armado a un Blob: el navegador lo puede guardar en el disco y no en la memoria. */
const FLUSH_BYTES = 32 * 1024 * 1024;

/** El almacenamiento no entregó un archivo adjunto. */
class StorageError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`El almacenamiento respondió ${status}.`);
    this.status = status;
  }
}

/**
 * ¿Vale la pena reintentar? Sin conexión o con el servidor caído, sí; un rechazo (sin permiso, no
 * existe, demasiadas seguidas) o un archivo que tardó demasiado, no.
 */
function transient(error: unknown): boolean {
  if (error instanceof DataError) return error.code === "network" || error.code === "server" || error.code === "unavailable";
  if (error instanceof StorageError) return error.status >= 500;
  // fetch falla con TypeError cuando se corta la conexión.
  return error instanceof TypeError;
}

async function withRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      if (attempt >= RETRY_DELAYS.length || !transient(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }
}

/** Todas las partes de una lista, una tras otra con el cursor de la anterior. */
async function allPages<T, P extends DataExportPage<T>>(
  fetchPage: (cursor: string | undefined) => Promise<P>,
  onPage: (page: P) => void | Promise<void>,
): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await withRetry(() => fetchPage(cursor));
    await onPage(page);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
}

type Fflate = typeof import("fflate");

/** El ZIP mientras se arma: los archivos se comprimen al agregarlos (los PDF, fotos y Excel ya vienen comprimidos). */
function createZip({ Zip, ZipDeflate, ZipPassThrough }: Fflate) {
  const parts: Blob[] = [];
  let chunks: Uint8Array<ArrayBuffer>[] = [];
  let pending = 0;
  let failure: Error | null = null;
  let finished = false;
  const zip = new Zip((error, chunk, final) => {
    if (error) failure = error;
    else {
      chunks.push(chunk as Uint8Array<ArrayBuffer>);
      pending += chunk.length;
      if (pending >= FLUSH_BYTES) {
        parts.push(new Blob(chunks));
        chunks = [];
        pending = 0;
      }
    }
    if (final || error) finished = true;
  });
  return {
    add(path: string, bytes: Uint8Array, compress: boolean) {
      const file = compress ? new ZipDeflate(path, { level: 6 }) : new ZipPassThrough(path);
      zip.add(file);
      file.push(bytes, true);
      if (failure) throw failure;
    },
    finish(): Blob {
      zip.end();
      if (failure || !finished) throw failure ?? new Error("El archivo ZIP no se terminó de armar.");
      return new Blob([...parts, new Blob(chunks)], { type: "application/zip" });
    },
  };
}

const encoder = new TextEncoder();

/**
 * Un archivo adjunto con su enlace firmado de unos minutos (la API no registra cada uno: la descarga ya
 * quedó en la actividad). En local el enlace es /api/files/…, que el servidor de desarrollo pasa a la API.
 */
function fetchAttachment(businessId: string, attachmentId: string): Promise<Uint8Array> {
  return withRetry(async () => {
    const { url } = await data.dataExport.attachmentUrl(businessId, attachmentId);
    const response = await fetch(url, { credentials: "omit", signal: AbortSignal.timeout(FILE_TIMEOUT_MS) });
    if (!response.ok) throw new StorageError(response.status);
    return new Uint8Array(await response.arrayBuffer());
  });
}

/** Arma el ZIP con todo lo que la persona se puede llevar e informa del avance. */
export async function buildDataExport(businessId: string, onProgress: (progress: ExportProgress) => void): Promise<ExportResult> {
  const done: Counts = { clients: 0, appointments: 0, clinicalRecords: 0, attachments: 0 };
  let total: Counts | null = null;
  const report = (step: ExportStep) => onProgress({ step, total, done: { ...done } });
  report("summary");

  const [summary, fflate] = await Promise.all([withRetry(() => data.dataExport.summary(businessId)), import("fflate")]);
  total = summary.counts;
  const { timezone } = summary.business;
  const zip = createZip(fflate);

  report("clients");
  const clients: DataExportClient[] = [];
  await allPages(
    (cursor) => data.dataExport.clients(businessId, cursor),
    (page) => {
      clients.push(...page.items);
      done.clients = clients.length;
      report("clients");
    },
  );
  zip.add("pacientes.xlsx", await xlsxFile(clientRows(clients, timezone), "Pacientes", CLIENT_COLUMN_WIDTHS), false);

  report("appointments");
  const appointments: DataExportAppointment[] = [];
  await allPages(
    (cursor) => data.dataExport.appointments(businessId, cursor),
    (page) => {
      appointments.push(...page.items);
      done.appointments = appointments.length;
      report("appointments");
    },
  );
  zip.add("citas.xlsx", await xlsxFile(appointmentRows(appointments), "Citas", APPOINTMENT_COLUMN_WIDTHS), false);

  const missing: { patient: string; fileName: string }[] = [];
  if (summary.clinical === "included") {
    report("clinical");
    const patientNames = uniqueNames();
    // Con «demasiadas descargas seguidas» no se piden más archivos: fallarían todos hasta dentro de 15 minutos.
    let filesStopped = false;
    const addRecord = async (record: DataExportClinicalRecord, templateVersions: DataExportClinicalPage["templateVersions"]) => {
      const name = patientNames(patientFileName(record.client));
      const fileNames = uniqueNames();
      const attachmentPaths: Record<string, string | null> = {};
      for (const attachment of record.attachments) {
        const [base, extension] = splitExtension(attachment.fileName);
        const fileName = fileNames(safeFileName(base, "Archivo"), extension);
        const path = `archivos/${name}/${fileName}`;
        attachmentPaths[attachment.id] = null;
        if (!filesStopped) {
          try {
            zip.add(`historias-clinicas/${path}`, await fetchAttachment(businessId, attachment.id), false);
            attachmentPaths[attachment.id] = path;
            done.attachments++;
          } catch (error) {
            // Sin sesión o sin permiso, nada más va a funcionar: se corta la descarga.
            if (error instanceof DataError && (error.code === "unauthorized" || error.code === "forbidden")) throw error;
            if (error instanceof DataError && error.code === "rate_limited") filesStopped = true;
          }
        }
        if (!attachmentPaths[attachment.id]) missing.push({ patient: record.client.name, fileName: attachment.fileName });
        report("clinical");
      }
      const html = clinicalRecordHtml({
        record,
        templateVersions,
        business: summary.business,
        exportedBy: summary.exportedBy,
        exportedAt: summary.exportedAt,
        attachmentPaths,
      });
      zip.add(`historias-clinicas/${name}.html`, encoder.encode(html), true);
      done.clinicalRecords++;
      report("clinical");
    };
    await allPages(
      (cursor) => data.dataExport.clinical(businessId, cursor),
      async (page) => {
        for (const record of page.items) await addRecord(record, page.templateVersions);
      },
    );
  }

  report("zip");
  zip.add("LEEME.html", encoder.encode(readmeHtml({ summary, included: done, missing })), true);
  const date = toZonedDate(summary.exportedAt, timezone);
  return {
    file: zip.finish(),
    fileName: `agenda360-${safeFileName(summary.business.slug, "negocio")}-${date}.zip`,
    missingFiles: missing.length,
  };
}

/** Guarda el archivo en el equipo (en el celular, en Archivos o Descargas). */
export function saveFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Safari lee el archivo después del clic: se libera pasado un rato.
  setTimeout(() => URL.revokeObjectURL(url), 2 * 60_000);
}
