import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BookingQrDialog } from "./booking-qr-dialog";

interface BookingLinkFieldProps {
  /** Enlace guardado (el que funciona ahora mismo). */
  savedSlug: string;
  /** El usuario está editando el enlace y aún no lo guarda. */
  pendingChange: boolean;
  /** Nombre guardado del negocio (va en la lámina del QR). */
  businessName: string;
}

/** Enlace público de reservas con acciones de copiar, abrir y descargar su código QR. */
export function BookingLinkField({ savedSlug, pendingChange, businessName }: BookingLinkFieldProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const url = `${window.location.origin}/book/${savedSlug}`;

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="grid gap-2 rounded-lg bg-muted/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">Tu enlace público actual</p>
      <p className="truncate text-sm font-semibold text-ink" title={url}>
        {url}
      </p>
      {pendingChange && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Guarda los cambios para activar el nuevo enlace. El anterior dejará de funcionar.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden /> Ver página
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setQrOpen(true)}>
          <QrCode aria-hidden /> Código QR
        </Button>
      </div>
      <BookingQrDialog open={qrOpen} onOpenChange={setQrOpen} url={url} businessName={businessName} slug={savedSlug} />
    </div>
  );
}
