import { UserPen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * «Por completar» (spec 012): al paciente le falta algún dato obligatorio del negocio (por ejemplo, un
 * importado sin cédula o sin email). `detail`: lo que falta («Faltan datos: cédula y email»), al pasar
 * el ratón y para el lector de pantalla. Con texto y no sólo color.
 */
export function IncompleteBadge({ detail, className }: { detail?: string; className?: string }) {
  return (
    <span
      title={detail}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-600/20",
        className,
      )}
    >
      <UserPen className="size-3" aria-hidden /> Por completar
      {detail && <span className="sr-only">. {detail}</span>}
    </span>
  );
}
