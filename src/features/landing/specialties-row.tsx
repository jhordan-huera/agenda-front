import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { FRAME, TECH_LABEL } from "./landing-styles";
import { SPECIALTIES } from "./specialties";

/**
 * La fila «Hecho para psicólogos · fisioterapeutas · odontólogos» de la portada (spec 041), debajo de la cinta
 * de funciones: un enlace a cada página por especialidad.
 */
export function SpecialtiesRow() {
  return (
    <nav aria-label="Especialidades" className={cn(FRAME, "flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-b border-border px-5 py-3 sm:px-8")}>
      <span className={cn(TECH_LABEL, "text-muted-foreground")}>Hecho para</span>
      {SPECIALTIES.map((specialty) => (
        <Link
          key={specialty.slug}
          to={`/${specialty.slug}`}
          className={cn(
            TECH_LABEL,
            "inline-flex min-h-11 items-center text-foreground underline decoration-ink/40 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-3 focus-visible:ring-ring/50",
          )}
        >
          {specialty.name}
        </Link>
      ))}
    </nav>
  );
}
