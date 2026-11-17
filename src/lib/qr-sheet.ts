import { encode } from "uqr";
import { DEFAULT_BRAND_COLORS, resolveBrandPalette, type BrandPalettes } from "@/lib/brand-theme";

/*
 * Las láminas con un código QR para imprimir o compartir: la de la página de reservas (spec 019) y la de la tarjeta de
 * fidelización para los pacientes (spec 052). Se dibujan en un canvas de 1200 px de ancho y se descargan en PNG.
 */

export interface SheetColors {
  qr: string;
  ink: string;
  muted: string;
  paper: string;
}

/**
 * Colores de la lámina: los del negocio (o los de Agenda360), siempre los del modo claro, también con la pantalla en
 * oscuro (spec 019): el QR va sobre blanco y con el color del texto, casi negro, para que lo lea cualquier cámara, y la
 * lámina se imprime. Sin colores propios, los de Agenda360 con la misma fórmula (los mismos de src/index.css).
 */
export function sheetColors(palettes: BrandPalettes | null): SheetColors {
  const { light } = palettes ?? resolveBrandPalette(DEFAULT_BRAND_COLORS);
  return { qr: light.text, ink: light.ink, muted: light.graphite, paper: "#ffffff" };
}

export const SHEET_FONT = '"Geist Variable", ui-sans-serif, system-ui, sans-serif';

/** El símbolo de Agenda360 (en PNG: un SVG sin tamaño propio no se dibuja en el canvas de todos los navegadores). */
export const AGENDA360_MARK = "/icon-calendar-192.png";

/** "https://agenda.app/book/dra-nadia" → "agenda.app/book/dra-nadia" */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

/** Achica la letra hasta que el texto quepa en el ancho (con un mínimo). */
export function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, minSize: number) {
  let current = size;
  ctx.font = `${weight} ${current}px ${SHEET_FONT}`;
  while (current > minSize && ctx.measureText(text).width > maxWidth) {
    current -= 2;
    ctx.font = `${weight} ${current}px ${SHEET_FONT}`;
  }
}

/**
 * Una imagen para el canvas. Con `crossOrigin`: el logo de un negocio viene de otro dominio (Supabase Storage, que
 * lo permite) y, sin eso, el canvas quedaría bloqueado y no se podría descargar.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se cargó ${src}`));
    image.src = src;
  });
}

/** El lado de la placa del logo, en proporción al QR: con la corrección alta (30 %) se lee igual. */
export const LOGO_PLATE_RATIO = 0.24;

const encodeFor = (url: string, withLogo: boolean) => encode(url, { border: 0, ecc: withLogo ? "H" : "M" });

/** El lado real del QR de `url` en un espacio de `maxSize` px (módulos enteros: queda un poco más chico). */
export function qrSide(url: string, maxSize: number, withLogo: boolean): number {
  const qr = encodeFor(url, withLogo);
  return Math.floor(maxSize / qr.size) * qr.size;
}

/** Dibuja el QR de `url` centrado en `maxSize` px (la corrección alta si lleva logo). Devuelve el lado que ocupó. */
export function drawQr(
  ctx: CanvasRenderingContext2D,
  url: string,
  { left, top, maxSize, color, withLogo }: { left: number; top: number; maxSize: number; color: string; withLogo: boolean },
): number {
  const qr = encodeFor(url, withLogo);
  const module = Math.floor(maxSize / qr.size);
  const size = module * qr.size;
  const start = left + Math.round((maxSize - size) / 2);
  ctx.fillStyle = color;
  qr.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(start + x * module, top + y * module, module, module);
    }),
  );
  return size;
}

/** La placa blanca con el logo entero (sin recortar) en el centro de `cx`, `cy`. */
export function drawLogoPlate(ctx: CanvasRenderingContext2D, image: HTMLImageElement, cx: number, cy: number, plate: number, border: string) {
  const radius = plate * 0.2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.max(2, plate * 0.02);
  ctx.beginPath();
  ctx.roundRect(cx - plate / 2, cy - plate / 2, plate, plate, radius);
  ctx.fill();
  ctx.stroke();
  const inner = plate * 0.78;
  const scale = Math.min(inner / image.naturalWidth, inner / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height);
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se generó la imagen"))), "image/png"),
  );
}
