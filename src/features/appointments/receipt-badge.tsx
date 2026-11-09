import { Receipt, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

/** El paciente envió el comprobante y aún no se marcó como pagada: hay que revisarlo. */
export function ReceiptBadge({ appointment }: { appointment: Pick<Appointment, "receiptAt" | "paidAt"> }) {
  if (!appointment.receiptAt || appointment.paidAt) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-ink">
      <Receipt className="size-3" aria-hidden /> Comprobante
    </span>
  );
}

/**
 * «Sin comprobante» (spec 039): la cita de un negocio con «Pedir el comprobante de pago» que aún no tiene
 * comprobante ni pago (la regla, en lib/payment-reminders.ts). En gris, con texto y no sólo el icono, también
 * para el lector de pantalla. Quien la pinta decide si aplica.
 */
export function MissingReceiptBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border ring-inset",
        className,
      )}
    >
      <ReceiptText className="size-3" aria-hidden /> Sin comprobante
    </span>
  );
}
