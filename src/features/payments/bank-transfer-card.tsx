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
import { cn } from "@/lib/utils";
import { fileContentType } from "@/lib/upload";
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES } from "@/lib/validations/payment";
import type { BankAccount } from "@/types";

interface BankTransferCardProps {
  /** Cuentas de la agenda (al menos una), la principal primero: vale cualquiera. */
  bankAccounts: BankAccount[];
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

interface DataRow {
  label: string;
  value: string;
  /** Con botón para copiarlo (número de cuenta, cédula/RUC). */
  copy?: boolean;
}

/** Banco, tipo, número, titular y cédula/RUC (si la tiene) de una cuenta. */
const accountRows = (account: BankAccount): DataRow[] => [
  { label: "Banco", value: account.bank },
  { label: "Tipo de cuenta", value: BANK_ACCOUNT_TYPE_LABELS[account.accountType] },
  { label: "Número de cuenta", value: account.number, copy: true },
  { label: "Titular", value: account.holder },
  ...(account.holderId ? [{ label: "Cédula / RUC", value: account.holderId, copy: true }] : []),
];

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copiado`);
  } catch {
    toast.error("No se pudo copiar");
  }
}

/**
 * Datos para pagar la cita por transferencia y cómo enviar el comprobante: subirlo aquí (va al
 * almacenamiento privado del negocio) o mandarlo por WhatsApp. Con varias cuentas, el paciente las
 * ve todas, una debajo de otra, y transfiere a cualquiera (el comprobante sigue siendo uno por cita).
 */
export function BankTransferCard({
  bankAccounts,
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
  const amountRow: DataRow[] = amount !== null ? [{ label: "Monto", value: formatPrice(amount, currency) }] : [];
  const single = bankAccounts.length === 1;

  return (
    <section className="min-w-0 rounded-2xl border bg-background p-5 sm:p-6" aria-labelledby="bank-transfer-title">
      <h3 id="bank-transfer-title" className="flex items-start gap-2 text-lg leading-snug font-bold">
        <Landmark className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        {single ? "Pago por transferencia" : "Transfiere a cualquiera de estas cuentas"}
      </h3>
      {single ? (
        <>
          <DataList rows={[...accountRows(bankAccounts[0]), ...amountRow]} className="mt-4" />
          <CopyAllButton rows={[...accountRows(bankAccounts[0]), ...amountRow]} />
        </>
      ) : (
        <>
          {amountRow.length > 0 && <DataList rows={amountRow} className="mt-4" />}
          <ol className="mt-4 grid gap-3">
            {bankAccounts.map((account, index) => (
              <li key={index} aria-label={`Cuenta ${index + 1}: ${account.bank}`} className="min-w-0 rounded-xl border p-3 sm:p-4">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 font-bold [overflow-wrap:anywhere]">{account.bank}</span>
                  <span className="text-sm text-muted-foreground">Cuenta {BANK_ACCOUNT_TYPE_LABELS[account.accountType].toLowerCase()}</span>
                </p>
                {/* Banco y tipo ya van en el encabezado de la cuenta. */}
                <DataList rows={accountRows(account).slice(2)} className="mt-2" />
                <CopyAllButton
                  rows={[...accountRows(account), ...amountRow]}
                  label="Copiar los datos"
                  ariaLabel={`Copiar los datos de la cuenta de ${account.bank}`}
                />
              </li>
            ))}
          </ol>
        </>
      )}

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

/** Filas "Etiqueta: valor"; las de número y cédula, con su botón de copiar. */
function DataList({ rows, className }: { rows: DataRow[]; className?: string }) {
  return (
    <dl className={cn("divide-y border-y", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
          <dt className="shrink-0 text-sm text-muted-foreground">{row.label}</dt>
          <dd className="flex min-w-0 items-center gap-1 text-right font-semibold">
            <span className={cn("min-w-0 [overflow-wrap:anywhere]", row.copy && "font-mono")}>{row.value}</span>
            {row.copy && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
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
  );
}

/** Copia todas las filas en texto ("Banco: …"), para pegarlas en la app del banco o en una nota. */
function CopyAllButton({ rows, label = "Copiar todos los datos", ariaLabel }: { rows: DataRow[]; label?: string; ariaLabel?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-3"
      aria-label={ariaLabel}
      onClick={() => copy(rows.map((row) => `${row.label}: ${row.value}`).join("\n"), "Datos")}
    >
      <Copy aria-hidden /> {label}
    </Button>
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
