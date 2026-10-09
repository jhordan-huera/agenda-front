import { DataError } from "@/lib/data/errors";
import type { UploadTarget } from "@/types";

/**
 * Subidas directas al almacenamiento (Supabase Storage): la API entrega una URL firmada y el
 * navegador envía ahí el archivo, sin pasar por la API.
 */

const BY_EXTENSION: Record<string, string> = {
  heic: "image/heic",
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Algunos navegadores no informan el tipo de HEIC o PDF: se deduce de la extensión. */
export function fileContentType(file: File): string {
  return file.type || BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
}

/** Tiempo máximo de una subida: unos 3 minutos (más en archivos grandes, a no menos de ~32 KB/s). */
const UPLOAD_MIN_TIMEOUT_MS = 3 * 60_000;
const UPLOAD_MIN_BYTES_PER_SECOND = 32 * 1024;

/**
 * Envía el archivo a la URL firmada, con el progreso (0–100). Con la red atascada, la subida se
 * cancela pasado el tiempo máximo con un error claro (y se puede reintentar), en vez de quedarse
 * "Enviando…" para siempre.
 */
export function uploadToStorage(
  upload: UploadTarget,
  body: Blob,
  options: { contentType?: string; onProgress?: (percent: number) => void } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(upload.method, upload.url);
    request.timeout = Math.max(UPLOAD_MIN_TIMEOUT_MS, Math.ceil(body.size / UPLOAD_MIN_BYTES_PER_SECOND) * 1000);
    for (const [name, value] of Object.entries(upload.headers)) request.setRequestHeader(name, value);
    // Con el tipo deducido, se envía el mismo que se declaró.
    if (!body.type && options.contentType) request.overrideMimeType(options.contentType);
    request.upload.onprogress = (event) =>
      event.lengthComputable && options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    request.onload = () =>
      request.status < 300 ? resolve() : reject(new DataError("server", "No se pudo subir el archivo. Inténtalo de nuevo."));
    request.onerror = () =>
      reject(new DataError("network", "Se perdió la conexión al subir el archivo. Revisa tu conexión e inténtalo de nuevo."));
    request.ontimeout = () =>
      reject(
        new DataError("network", "La subida tardó demasiado y se canceló. Revisa tu conexión (mejor con wifi) e inténtalo de nuevo."),
      );
    request.onabort = () => reject(new DataError("network", "Se canceló la subida del archivo. Inténtalo de nuevo."));
    request.send(body);
  });
}

/**
 * Reduce una imagen (lado mayor `maxSize` px) y la pasa a WebP; si el navegador no sabe generar
 * WebP, a PNG (conserva la transparencia de los logos) o JPEG. Una foto de 5 MB queda en decenas de KB.
 */
export async function shrinkImage(file: File, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return webp;
  const fallback = await toBlob(file.type === "image/png" ? "image/png" : "image/jpeg");
  if (!fallback) throw new DataError("validation", "No pudimos procesar la imagen. Prueba con otra.");
  return fallback;
}

/** Lado mayor de las fotos de comprobantes: se leen bien y pesan unos 150–300 KB. */
const RECEIPT_MAX_SIZE = 2000;

/**
 * Comprobante listo para subir: las fotos se reducen y pasan a WebP (una foto de 3 MB queda en
 * unos 200 KB); los PDF van tal cual. Si reducirla no ahorra nada, o el navegador no puede leerla
 * (p. ej. HEIC fuera de Safari), se sube la original.
 */
export async function prepareReceipt(file: File): Promise<{ body: Blob; contentType: string; fileName: string }> {
  const contentType = fileContentType(file);
  const original = { body: file as Blob, contentType, fileName: file.name };
  if (!contentType.startsWith("image/")) return original;
  const image = await shrinkImage(file, RECEIPT_MAX_SIZE).catch(() => null);
  if (!image || image.size >= file.size) return original;
  const extension = image.type === "image/webp" ? "webp" : image.type === "image/png" ? "png" : "jpg";
  return { body: image, contentType: image.type, fileName: `${file.name.replace(/\.[^.]+$/, "") || "comprobante"}.${extension}` };
}
