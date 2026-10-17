import { ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reserva «Por verificar» (spec 009): la cédula es de otro paciente del negocio, pero el email y el
 * teléfono no coinciden con su ficha. Con texto y no sólo color, también para el lector de pantalla.
 */
export function VerifyBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40",
        className,
      )}
    >
      <ShieldQuestion className="size-3" aria-hidden /> Por verificar
    </span>
  );
}
