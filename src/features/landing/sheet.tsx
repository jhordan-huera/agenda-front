import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Una hoja de papel sobre la pared (spec 030): las tarjetas de la portada y los trozos de la app. Todas con
 * la misma profundidad, una sombra en capas apenas visible (un anillo en el oscuro); `lifted`, la que va
 * encima de otra (el celular de la portada).
 */
export function Sheet({ lifted = false, className, ...props }: ComponentProps<"div"> & { lifted?: boolean }) {
  return <div className={cn("rounded-2xl bg-card text-card-foreground", lifted ? "shadow-lifted" : "shadow-sheet", className)} {...props} />;
}
