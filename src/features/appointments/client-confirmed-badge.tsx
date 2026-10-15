import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";
import { clientConfirmationSummary } from "./appointment-utils";

/**
 * «Confirmó el paciente» (spec 010): el paciente pulsó «Confirmo que voy» en su email. Con texto y no
 * sólo el icono, también para el lector de pantalla, y con los colores del tema, como «Llegó». No es el
 * estado de la cita: confirmarla sigue siendo del negocio. `short`: «Confirmó», para las filas del Inicio.
 */
export function ClientConfirmedBadge({
  appointment,
  short = false,
  className,
}: {
  appointment: Pick<Appointment, "clientId" | "extraClientIds" | "clientConfirmations">;
  short?: boolean;
  className?: string;
}) {
  const summary = clientConfirmationSummary(appointment);
  if (!summary) return null;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-highlight/60 px-2 py-0.5 text-xs font-medium text-ink", className)}
    >
      <UserCheck className="size-3" aria-hidden /> {short ? summary.short : summary.label}
    </span>
  );
}
