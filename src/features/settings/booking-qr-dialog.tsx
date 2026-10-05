import { Download, FileImage } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { encode, renderSVG } from "uqr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Colores de la marca (los mismos de src/index.css): el QR va casi negro para que lo lea cualquier cámara. */
const COLORS = { qr: "#1d2433", ink: "#4a6cb0", text: "#1d2433", muted: "#5b6478", paper: "#ffffff" };
const FONT = '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif';

interface BookingQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  businessName: string;
  slug: string;
}

/** Código QR del enlace de reservas, para mostrarlo en el local, en tarjetas o en redes. */
export function BookingQrDialog({ open, onOpenChange, url, businessName, slug }: BookingQrDialogProps) {
  const [pending, setPending] = useState(false);
  const preview = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url, { pixelSize: 8, border: 2, blackColor: COLORS.qr }))}`,
    [url],
  );

  const downloadPng = async () => {
    setPending(true);
    try {
      download(await renderPrintablePng(url, businessName), `qr-reservas-${slug}.png`);
    } catch {
      toast.error("No se pudo generar la imagen. Prueba con la versión SVG.");
    } finally {
      setPending(false);
    }
  };

  const downloadSvg = () => {
    const svg = renderSVG(url, { pixelSize: 10, border: 4, blackColor: COLORS.qr });
    download(new Blob([svg], { type: "image/svg+xml" }), `qr-reservas-${slug}.svg`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Código QR de tu página de reservas</DialogTitle>
          <DialogDescription>
            Al escanearlo con la cámara del celular, tus clientes abren tu página y reservan. Imprímelo para tu local o
            compártelo en tus redes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-3 rounded-xl border bg-background p-5">
          <img src={preview} alt={`Código QR del enlace ${url}`} className="size-56" data-testid="booking-qr" />
          <p className="max-w-full truncate text-sm font-semibold text-ink" title={url}>
            {displayUrl(url)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Si cambias el enlace de reservas, el QR anterior deja de funcionar: vuelve a descargarlo.
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={downloadSvg}>
            <FileImage aria-hidden /> Descargar SVG
          </Button>
          <Button type="button" onClick={downloadPng} disabled={pending}>
            <Download aria-hidden /> Descargar para imprimir (PNG)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "https://agenda.app/book/dra-nadia" → "agenda.app/book/dra-nadia" */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function download(blob: Blob, fileName: string): void {
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
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, minSize: number) {
  let current = size;
  ctx.font = `${weight} ${current}px ${FONT}`;
  while (current > minSize && ctx.measureText(text).width > maxWidth) {
    current -= 2;
    ctx.font = `${weight} ${current}px ${FONT}`;
  }
}

/**
 * Lámina para imprimir (1200 px de ancho): "Reserva tu cita", el nombre del negocio, el QR y el
 * enlace escrito, por si alguien prefiere teclearlo.
 */
async function renderPrintablePng(url: string, businessName: string): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 72px ${FONT}`),
    document.fonts.load(`600 40px ${FONT}`),
  ]).catch(() => undefined);

  const qr = encode(url, { border: 0 });
  const width = 1200;
  const margin = 100;
  const module = Math.floor((width - margin * 2 - 80) / qr.size);
  const qrSize = module * qr.size;
  const qrTop = 330;
  const height = qrTop + qrSize + 240;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText("Reserva tu cita", width / 2, 150);

  ctx.fillStyle = COLORS.text;
  fitText(ctx, businessName, 800, 72, width - margin * 2, 36);
  ctx.fillText(businessName, width / 2, 245);

  const left = Math.round((width - qrSize) / 2);
  ctx.fillStyle = COLORS.qr;
  qr.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) ctx.fillRect(left + x * module, qrTop + y * module, module, module);
    }),
  );

  ctx.fillStyle = COLORS.ink;
  const link = displayUrl(url);
  fitText(ctx, link, 600, 40, width - margin * 2, 24);
  ctx.fillText(link, width / 2, qrTop + qrSize + 100);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText("Escanéalo con la cámara de tu celular", width / 2, qrTop + qrSize + 165);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se generó la imagen"))), "image/png"),
  );
}
