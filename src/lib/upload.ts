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

/** Envía el archivo a la URL firmada, con el progreso (0–100). */
export function uploadToStorage(
  upload: UploadTarget,
  body: Blob,
  options: { contentType?: string; onProgress?: (percent: number) => void } = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(upload.method, upload.url);
    for (const [name, value] of Object.entries(upload.headers)) request.setRequestHeader(name, value);
    // Con el tipo deducido, se envía el mismo que se declaró.
    if (!body.type && options.contentType) request.overrideMimeType(options.contentType);
    request.upload.onprogress = (event) =>
      event.lengthComputable && options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    request.onload = () => (request.status < 300 ? resolve() : reject(new Error("No se pudo subir el archivo. Inténtalo de nuevo.")));
    request.onerror = () => reject(new Error("Se perdió la conexión al subir el archivo."));
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
  if (!fallback) throw new Error("No pudimos procesar la imagen.");
  return fallback;
}
