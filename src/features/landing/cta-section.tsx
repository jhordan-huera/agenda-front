import { Check } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupCta } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/** El foco sobre el casi negro del cierre: el anillo del texto claro, que se ve sobre él (el de la marca no). */
const FOCUS_ON_SHELL = "focus-visible:border-shell-foreground focus-visible:ring-shell-foreground/60";

/** Tres hechos al pie del cierre, como los del ejemplo pero reales: no hay prueba de 14 días, hay un plan gratis. */
const TICKS = ["Gratis para empezar", "Sin tarjeta", "Sin instalar nada"];

/**
 * Cierre (spec 032): una franja centrada en --shell (casi negro, con el tono de la marca), sin degradado ni
 * dibujo, con el botón principal y la página de reservas de ejemplo; debajo, los tres hechos e «Iniciar
 * sesión». Los textos van en --shell-foreground puro o al 75 % (más de 7:1 en los dos modos: check:contrast,
 * «Cierre»). Con el registro cerrado, el botón es «Quiero mi agenda» (spec 022).
 */
export function CtaSection({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="cierre-titulo" className="bg-shell text-shell-foreground dark:border-y dark:border-border">
      <div className={cn(CONTAINER, "py-16 text-center sm:py-24")}>
        <h2 id="cierre-titulo" className="mx-auto max-w-3xl text-headline font-bold">
          Deja que tus pacientes elijan su hora.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-shell-foreground/75">
          Creas tu agenda, escribes tus servicios y tus horarios, y compartes tu enlace. Puedes empezar hoy.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <SignupCta contact={signup} arrow className={cn("h-12 px-6 text-base", FOCUS_ON_SHELL)} />
          <Button
            asChild
            variant="outline"
            className={cn(
              "h-12 border-shell-foreground/40 bg-transparent px-5 text-base text-shell-foreground hover:bg-shell-foreground/10 hover:text-shell-foreground dark:border-shell-foreground/40 dark:bg-transparent dark:hover:bg-shell-foreground/10",
              FOCUS_ON_SHELL,
            )}
          >
            <Link to={DEMO_BOOKING_PATH}>Probar una página de reservas</Link>
          </Button>
        </div>
        <ul className="mt-8 flex flex-col items-center justify-center gap-x-7 gap-y-2 text-sm text-shell-foreground/75 sm:flex-row">
          {TICKS.map((tick) => (
            <li key={tick} className="inline-flex items-center gap-2">
              <Check className="size-4 text-shell-foreground" aria-hidden />
              {tick}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-shell-foreground/75">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold text-shell-foreground underline decoration-shell-foreground/50 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-3 focus-visible:ring-shell-foreground/60"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </section>
  );
}
