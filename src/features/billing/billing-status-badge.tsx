import { Badge } from "@/components/ui/badge";
import { BILLING_STATUS_LABELS } from "@/lib/constants/business";
import { cn } from "@/lib/utils";
import type { BillingStatus } from "@/types";

/** Los colores de cada estado, en los dos modos (siempre con el texto: el color sólo acompaña). */
const TONES: Record<BillingStatus, string> = {
  due: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  in_review: "bg-highlight text-lilac-ink",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  void: "bg-muted text-muted-foreground",
};

/**
 * El estado de un cobro de la mensualidad (spec 029): «Por pagar», «En revisión», «Pagado», «Rechazado» o
 * «Anulado». Con `overdue`, un cobro por pagar pasada la gracia dice «Atrasado» (sólo en /admin).
 */
export function BillingStatusBadge({ status, overdue = false, className }: { status: BillingStatus; overdue?: boolean; className?: string }) {
  const late = overdue && status === "due";
  return <Badge className={cn(late ? TONES.rejected : TONES[status], className)}>{late ? "Atrasado" : BILLING_STATUS_LABELS[status]}</Badge>;
}
