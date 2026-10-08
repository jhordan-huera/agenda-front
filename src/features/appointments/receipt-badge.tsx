import { Receipt } from "lucide-react";
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
