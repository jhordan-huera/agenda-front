import { Download, FileImage } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandPaletteContext } from "@/features/branding/brand-palette-context";
import { canvasToPng, displayUrl, downloadBlob as download, drawQr, fitText, qrSide, SHEET_FONT as FONT, sheetColors, type SheetColors } from "@/lib/qr-sheet";

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
  const colors = sheetColors(useContext(BrandPaletteContext));
  const preview = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url, { pixelSize: 8, border: 2, blackColor: colors.qr }))}`,
    [url, colors.qr],
  );

  const downloadPng = async () => {
    setPending(true);
    try {
      download(await renderPrintablePng(url, businessName, colors), `qr-reservas-${slug}.png`);
    } catch {
      toast.error("No se pudo generar la imagen. Prueba con la versión SVG.");
    } finally {
      setPending(false);
    }
  };

  const downloadSvg = () => {
    const svg = renderSVG(url, { pixelSize: 10, border: 4, blackColor: colors.qr });
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
          {/* Blanco a propósito: el QR necesita fondo blanco para escanearse (spec 019). */}
          <img src={preview} alt={`Código QR del enlace ${url}`} className="size-56 rounded-lg bg-white" data-testid="booking-qr" />
          <p className="max-w-full truncate text-sm font-semibold text-ink" title={url}>
            {displayUrl(url)}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Si cambias el enlace de reservas, el QR anterior deja de funcionar: vuelve a descargarlo.
        </p>
        {/* Uno debajo del otro: en el diálogo angosto, «Descargar para imprimir (PNG)» no cabe al lado. */}
        <DialogFooter className="gap-2 sm:flex-col-reverse">
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

/**
 * Lámina para imprimir (1200 px de ancho): "Reserva tu cita", el nombre del negocio, el QR y el
 * enlace escrito, por si alguien prefiere teclearlo.
 */
async function renderPrintablePng(url: string, businessName: string, colors: SheetColors): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`800 72px ${FONT}`),
    document.fonts.load(`600 40px ${FONT}`),
  ]).catch(() => undefined);

  const width = 1200;
  const margin = 100;
  const maxQr = width - margin * 2 - 80;
  const qrTop = 330;

  const height = qrTop + qrSide(url, maxQr, false) + 240;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = colors.ink;
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText("Reserva tu cita", width / 2, 150);

  ctx.fillStyle = colors.qr;
  fitText(ctx, businessName, 800, 72, width - margin * 2, 36);
  ctx.fillText(businessName, width / 2, 245);

  const qrSize = drawQr(ctx, url, { left: (width - maxQr) / 2, top: qrTop, maxSize: maxQr, color: colors.qr, withLogo: false });

  ctx.fillStyle = colors.ink;
  const link = displayUrl(url);
  fitText(ctx, link, 600, 40, width - margin * 2, 24);
  ctx.fillText(link, width / 2, qrTop + qrSize + 100);

  ctx.fillStyle = colors.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText("Escanéalo con la cámara de tu celular", width / 2, qrTop + qrSize + 165);

  return canvasToPng(canvas);
}
