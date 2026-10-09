import { CircleCheck, Copy, FileUp, Landmark, Loader2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUploadReceipt } from "@/hooks/queries/use-public-booking";
import { BANK_ACCOUNT_TYPE_LABELS } from "@/lib/constants/business";
import { DataError, getErrorMessage } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { fileContentType } from "@/lib/upload";
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES } from "@/lib/validations/payment";
import type { BankAccount } from "@/types";

interface BankTransferCardProps {
  bankAccount: BankAccount;
  /** Monto a transferir (null: el negocio no muestra el precio). */
  amount: number | null;
  currency: string;
  /** Enlace de pago de la cita: autoriza la subida del comprobante. */
  token: string;
  /** false: sólo se puede enviar por WhatsApp. */
  receiptsEnabled: boolean;
  /** Enlace al WhatsApp del negocio con el mensaje escrito (null: el negocio no tiene teléfono). */
  whatsappUrl: string | null;
  /** Comprobantes que ya envió (uno basta: después ya no se sube otro). */
  receiptsSent?: number;
  /** El negocio ya marcó la cita como pagada. */
  paid?: boolean;
}

/**
 * Datos para pagar la cita por transferencia y cómo enviar el comprobante: subirlo aquí (va al
 * almacenamiento privado del negocio) o mandarlo por WhatsApp.
 */
export function BankTransferCard({
  bankAccount,
  amount,
  currency,
  token,
  receiptsEnabled,
  whatsappUrl,
  receiptsSent = 0,
  paid = false,
}: BankTransferCardProps) {
  // Un comprobante por cita: enviado (ahora o antes), ya no se sube otro.
  const [sentHere, setSentHere] = useState(false);
  const sent = sentHere || receiptsSent > 0;
  const rows = [
    { label: "Banco", value: bankAccount.bank },
    { label: "Tipo de cuenta", value: BANK_ACCOUNT_TYPE_LABELS[bankAccount.accountType] },
    { label: "Número de cuenta", value: bankAccount.number, copy: true },
    { label: "Titular", value: bankAccount.holder },
    ...(bankAccount.holderId ? [{ label: "Cédula / RUC", value: bankAccount.holderId, copy: true }] : []),
    ...(amount !== null ? [{ label: "Monto", value: formatPrice(amount, currency) }] : []),
  ];

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <section className="rounded-2xl border bg-background p-5 sm:p-6" aria-labelledby="bank-transfer-title">
      <h3 id="bank-transfer-title" className="flex items-center gap-2 text-lg font-bold">
        <Landmark className="size-5 text-primary" aria-hidden /> Pago por transferencia
      </h3>
      <dl className="mt-4 divide-y border-y">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="flex items-center gap-1 text-right font-semibold">
              <span className={row.copy ? "font-mono" : undefined}>{row.value}</span>
              {row.copy && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Copiar ${row.label.toLowerCase()}`}
                  onClick={() => copy(row.value, row.label)}
                >
                  <Copy className="size-3.5" aria-hidden />
                </Button>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => copy(rows.map((row) => `${row.label}: ${row.value}`).join("\n"), "Datos")}
      >
        <Copy aria-hidden /> Copiar todos los datos
      </Button>

      {paid ? (
        <SuccessNote title="Pago confirmado" text="El negocio ya confirmó tu pago. ¡Gracias!" />
      ) : sent ? (
        <div className="grid gap-2">
          <SuccessNote title="Comprobante enviado" text="El negocio lo revisará y confirmará tu pago." />
          {whatsappUrl && (
            <p className="text-xs text-muted-foreground">
              ¿Te equivocaste de archivo?{" "}
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-4">
                Escríbele al negocio por WhatsApp
              </a>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <p className="text-sm text-muted-foreground">
            Cuando transfieras, envía el comprobante para que el negocio confirme tu pago.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {receiptsEnabled && <ReceiptUploadButton token={token} onSent={() => setSentHere(true)} />}
            {whatsappUrl && (
              <Button asChild variant="outline" className="h-11 px-5">
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  <WhatsAppIcon className="size-4" /> Enviar por WhatsApp
                </a>
              </Button>
            )}
          </div>
          {whatsappUrl && (
            <p className="text-xs text-muted-foreground">Por WhatsApp, adjunta tú la foto del comprobante en el chat.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Foto que se acepta elegir (se reduce antes de subirla). */
const MAX_PHOTO_BYTES = 30 * 1024 * 1024;

/** Aviso en verde: el comprobante se envió o el pago ya está confirmado. */
function SuccessNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-lg bg-emerald-50 p-3 text-emerald-900" role="status">
      <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
      <p className="text-sm">
        <span className="block font-semibold">{title}</span>
        {text}
      </p>
    </div>
  );
}

/** Sube la foto o el PDF del comprobante, con progreso; al terminar, el negocio recibe un aviso. */
function ReceiptUploadButton({ token, onSent }: { token: string; onSent: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadReceipt(token);
  const [progress, setProgress] = useState(0);
  // Evita dos subidas a la vez (p. ej. "Reintentar" en el aviso mientras ya se envía otro archivo).
  const sending = useRef(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const type = fileContentType(file);
    if (!(RECEIPT_TYPES as readonly string[]).includes(type)) {
      toast.error("Sube una foto (JPG, PNG, WebP, HEIC) o un PDF.");
      return;
    }
    // Las fotos se reducen antes de subirlas: se aceptan más grandes que un PDF.
    if (file.size > (type === "application/pdf" ? RECEIPT_MAX_BYTES : MAX_PHOTO_BYTES)) {
      toast.error(type === "application/pdf" ? "El PDF supera los 10 MB." : "La foto pesa demasiado. Prueba con otra.");
      return;
    }
    await send(file);
  };

  const send = async (file: File) => {
    if (sending.current) return;
    sending.current = true;
    setProgress(0);
    try {
      await upload.mutateAsync({ file, onProgress: setProgress });
      toast.success("Comprobante enviado", { description: "El negocio lo revisará y confirmará tu pago." });
      onSent();
    } catch (error) {
      // Si la red falló (o la subida tardó demasiado), se puede reintentar con el mismo archivo.
      const retry = error instanceof DataError && error.code === "network";
      toast.error(getErrorMessage(error), {
        duration: retry ? 15_000 : undefined,
        action: retry ? { label: "Reintentar", onClick: () => void send(file) } : undefined,
      });
    } finally {
      sending.current = false;
    }
  };

  return (
    <div className="grid gap-2">
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} onChange={handleFile} />
      <Button type="button" className="h-11 px-5" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
        {upload.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />}
        {upload.isPending ? "Enviando…" : "Subir comprobante"}
      </Button>
      {upload.isPending && <Progress value={progress} aria-label="Progreso de la subida" />}
    </div>
  );
}
