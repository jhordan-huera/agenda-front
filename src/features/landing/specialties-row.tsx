import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER } from "./landing-styles";
import { SPECIALTIES } from "./specialties";

/**
 * «Hecho para» psicólogos, fisioterapeutas y odontólogos (spec 041), debajo del panel de marca: un enlace a cada
 * página por especialidad. Es el destino de «Especialidades» en la barra (spec 043).
 */
export function SpecialtiesRow() {
  return (
    <section aria-labelledby="titulo-especialidades" id={LANDING_SECTIONS.specialties} className={cn(CONTAINER, "py-10 sm:py-12")}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-5">
        <h2 id="titulo-especialidades" className="font-display text-lg font-bold">
          Hecho para
        </h2>
        <ul className="flex flex-wrap justify-center gap-2.5">
          {SPECIALTIES.map((specialty) => (
            <li key={specialty.slug}>
              <Link
                to={`/${specialty.slug}`}
                className="font-display inline-flex min-h-11 items-center rounded-full bg-card px-5 font-semibold ring-1 ring-border transition-colors outline-none ring-inset hover:ring-ink focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                {specialty.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
