import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";

interface MadeWithAgenda360Props {
  /** El negocio de la página: la portada lo recibe en `?desde=` y lo nombra en su mensaje (spec 022). */
  slug?: string;
  /** Lo que sigue en la misma línea (p. ej. « · Privacidad»). */
  children?: ReactNode;
  className?: string;
}

/**
 * «Agenda online con Agenda360 · ¿Eres profesional? Crea tu agenda» (spec 022): al final de las páginas de
 * los pacientes (reservas, pago y cita), siempre y en todos los planes; ningún negocio lo oculta. Es un
 * solo enlace, pequeño y en otra pestaña, para no distraer de reservar.
 */
export function MadeWithAgenda360({ slug, children, className }: MadeWithAgenda360Props) {
  const href = slug ? `/?desde=${encodeURIComponent(slug)}` : "/";
  return (
    <footer className={cn("px-4 py-6 text-center text-xs text-muted-foreground", className)}>
      <a href={href} target="_blank" rel="noopener" className="group rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        Agenda online con <span className="font-semibold text-foreground">{APP_NAME}</span>
        {" · "}
        {/* En el celular pasa de línea entero: «Crea tu agenda» no se parte. */}
        <span className="whitespace-nowrap">
          ¿Eres profesional?{" "}
          <span className="font-medium text-foreground underline underline-offset-2 group-hover:no-underline">Crea tu agenda</span>
        </span>
      </a>
      {children}
    </footer>
  );
}
