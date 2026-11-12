import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * «Por cobrar $75» (spec 046) en la lista de pacientes: lo que suman sus sesiones atendidas sin marcar como
 * pagadas. En la gama de la marca, con texto y no sólo color. Sin nada por cobrar, no sale.
 */
export function PendingBadge({ amount, currency, className }: { amount: number; currency?: string; className?: string }) {
  if (amount <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-ink tabular-nums",
        className,
      )}
    >
      <Wallet className="size-3" aria-hidden /> Por cobrar {formatCurrency(amount, currency)}
    </span>
  );
}
