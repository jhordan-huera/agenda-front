import { Copy, Download, QrCode } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { renderSVG } from "uqr";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandPaletteContext } from "@/features/branding/brand-palette-context";
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { usePatientInvite } from "@/hooks/queries/use-patient-account";
import { patientInviteUrl } from "@/lib/constants/loyalty";
import { publicOrigin } from "@/lib/public-url";
import {
  AGENDA360_MARK,
  canvasToPng,
  displayUrl,
  downloadBlob,
  drawLogoPlate,
  drawQr,
  fitText,
  loadImage,
  LOGO_PLATE_RATIO,
  qrSide,
  SHEET_FONT,
  sheetColors,
  type SheetColors,
} from "@/lib/qr-sheet";
import { cn } from "@/lib/utils";
import { getShareWhatsAppUrl } from "@/lib/whatsapp";

/*
 * «QR para tus pacientes» (spec 052, pedido del dueño): el QR de «Mi tarjeta» con el nombre y el logo del consultorio
 * en el centro (el de Agenda360 si no tiene), para imprimirlo en la recepción o compartirlo. Al escanearlo, el
 * paciente crea su cuenta; el consultorio la une a su ficha cuando escanea el QR de la cuenta en su cita.
 */

/** El botón que abre el diálogo (Fidelización y Escanear). */
export function PatientInviteButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <QrCode /> QR para tus pacientes
      </Button>
      <PatientInviteDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

const inviteMessage = (businessName: string, url: string) =>
  `Crea tu cuenta de la tarjeta de fidelización de ${businessName} y suma un sello en cada cita: ${url}`;

export function PatientInviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: business } = useCurrentBusiness();
  const invite = usePatientInvite(open && business ? business.slug : null);
  const colors = sheetColors(useContext(BrandPaletteContext));
  const [pending, setPending] = useState(false);
  const url = business ? patientInviteUrl(publicOrigin(), business.slug) : "";
  const logo = business?.logoUrl ?? null;
  const programName = invite.data?.programName ?? null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar. Mantén presionado el enlace para copiarlo.");
    }
  };

  const downloadPng = async () => {
    if (!business) return;
    setPending(true);
    try {
      const { blob, withOwnLogo } = await renderInvitePng({ url, businessName: business.name, programName, logo, colors });
      downloadBlob(blob, `qr-tarjeta-${business.slug}.png`);
      if (logo && !withOwnLogo) toast.info("No pudimos poner tu logo en la imagen: va con el de Agenda360.");
    } catch {
      toast.error("No se pudo generar la imagen. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR para tus pacientes</DialogTitle>
          <DialogDescription>
            Al escanearlo con la cámara del celular, tus pacientes crean su cuenta y ven tu tarjeta de sellos. Imprímelo para
            tu recepción o compártelo por WhatsApp y en tus redes.
          </DialogDescription>
        </DialogHeader>
        {business && (
          <div className="grid justify-items-center gap-3 rounded-xl border bg-background p-5">
            {programName && <p className="text-sm font-semibold text-ink">«{programName}»</p>}
            <QrWithLogo url={url} logo={logo} color={colors.qr} className="size-56" label={`Código QR de ${displayUrl(url)}`} />
            <p className="max-w-full truncate text-sm font-semibold text-ink" title={url}>
              {business.name}
            </p>
            <p className="max-w-full truncate text-xs text-muted-foreground" title={url}>
              {displayUrl(url)}
            </p>
          </div>
        )}
        {invite.data && !invite.data.programName && (
          <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm">
            <span className="font-medium">Tu tarjeta está apagada.</span> Tus pacientes pueden crear su cuenta, pero no verán su
            tarjeta ni sumarán sellos hasta que la enciendas en Fidelización.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Después de crear su cuenta, escanea el QR de su cuenta en su próxima cita para unirla a su ficha: desde ahí suma
          sus sellos.
        </p>
        <DialogFooter className="gap-2 sm:flex-col-reverse">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={copy} disabled={!business}>
              <Copy aria-hidden /> Copiar enlace
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href={business ? getShareWhatsAppUrl(inviteMessage(business.name, url)) : undefined} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="size-4" /> Compartir por WhatsApp
              </a>
            </Button>
          </div>
          <Button type="button" onClick={downloadPng} disabled={pending || !business}>
            <Download aria-hidden /> Descargar para imprimir (PNG)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * El QR con el logo en el centro, sobre su placa blanca (corrección alta: se lee igual). Blanco a propósito, también
 * en el oscuro (spec 019). Sin logo, o si no carga, el de Agenda360.
 */
export function QrWithLogo({
  url,
  logo,
  color,
  className,
  label,
}: {
  url: string;
  logo: string | null;
  color: string;
  className?: string;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(renderSVG(url, { ecc: "H", pixelSize: 8, border: 2, blackColor: color }))}`,
    [url, color],
  );
  return (
    <div className={cn("relative rounded-lg bg-white", className)} role="img" aria-label={label}>
      <img src={src} alt="" className="size-full" data-testid="patient-invite-qr" />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 flex size-[21%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[20%] border border-neutral-200 bg-white p-[2.5%]"
      >
        <img
          src={logo && !failed ? logo : AGENDA360_MARK}
          alt=""
          className="max-h-full max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    </div>
  );
}

/**
 * La lámina para imprimir (1200 px de ancho): el programa, el nombre del consultorio, el QR con el logo y qué hacer.
 * Si el logo del negocio no se puede dibujar, va el de Agenda360 (`withOwnLogo` lo dice).
 */
async function renderInvitePng({
  url,
  businessName,
  programName,
  logo,
  colors,
}: {
  url: string;
  businessName: string;
  programName: string | null;
  logo: string | null;
  colors: SheetColors;
}): Promise<{ blob: Blob; withOwnLogo: boolean }> {
  await Promise.all([document.fonts.load(`800 72px ${SHEET_FONT}`), document.fonts.load(`600 40px ${SHEET_FONT}`)]).catch(() => undefined);
  const own = logo ? await loadImage(logo).catch(() => null) : null;
  const image = own ?? (await loadImage(AGENDA360_MARK).catch(() => null));

  const width = 1200;
  const margin = 100;
  const maxQr = width - margin * 2 - 120;
  const qrTop = 330;
  const side = qrSide(url, maxQr, true);
  const height = qrTop + side + 300;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const title = programName ? `«${programName}»` : "Tu tarjeta de fidelización";
  ctx.fillStyle = colors.ink;
  fitText(ctx, title, 700, 52, width - margin * 2, 30);
  ctx.fillText(title, width / 2, 150);

  ctx.fillStyle = colors.qr;
  fitText(ctx, businessName, 800, 72, width - margin * 2, 36);
  ctx.fillText(businessName, width / 2, 245);

  drawQr(ctx, url, { left: (width - maxQr) / 2, top: qrTop, maxSize: maxQr, color: colors.qr, withLogo: true });
  if (image) drawLogoPlate(ctx, image, width / 2, qrTop + side / 2, side * LOGO_PLATE_RATIO, "#e5e5e5");

  ctx.fillStyle = colors.ink;
  fitText(ctx, "Crea tu cuenta y suma un sello en cada cita", 600, 42, width - margin * 2, 26);
  ctx.fillText("Crea tu cuenta y suma un sello en cada cita", width / 2, qrTop + side + 100);

  ctx.fillStyle = colors.muted;
  ctx.font = `500 32px ${SHEET_FONT}`;
  ctx.fillText("Escanéalo con la cámara de tu celular", width / 2, qrTop + side + 165);

  const link = displayUrl(url);
  fitText(ctx, link, 500, 26, width - margin * 2, 18);
  ctx.fillText(link, width / 2, qrTop + side + 225);

  return { blob: await canvasToPng(canvas), withOwnLogo: Boolean(own) };
}
