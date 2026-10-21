import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/** El foco sobre el azul: el anillo del texto claro, que se ve sobre él (el de la marca no). */
const FOCUS_ON_BRAND = "focus-visible:border-hero-foreground focus-visible:ring-hero-foreground/60";

/**
 * Cierre (spec 030): una franja sobria en el azul de la marca, sin degradado ni dibujo, con el texto claro
 * de --hero-foreground (4,5:1 en los dos modos: check:contrast, «Degrad.»). Con el registro cerrado, el
 * botón es «Quiero mi agenda» (spec 022).
 */
export function CtaSection({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="cierre-titulo" className="bg-hero text-hero-foreground">
      <div className={cn(CONTAINER, "grid grid-cols-1 gap-8 py-16 sm:py-20 lg:grid-cols-12 lg:items-end lg:gap-10")}>
        <div className="lg:col-span-7">
          <h2 id="cierre-titulo" className="text-headline font-bold">
            Deja que tus pacientes elijan su hora.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed">
            Creas tu agenda, escribes tus servicios y tus horarios, y compartes tu enlace. Puedes empezar hoy, gratis.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
          <Button asChild className={cn("h-12 bg-hero-foreground px-6 text-base text-hero hover:bg-hero-foreground/90", FOCUS_ON_BRAND)}>
            <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" />
          </Button>
          <Button
            asChild
            variant="outline"
            className={cn(
              "h-12 border-hero-foreground/60 bg-transparent px-5 text-base text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground dark:border-hero-foreground/60 dark:bg-transparent dark:hover:bg-hero-foreground/10",
              FOCUS_ON_BRAND,
            )}
          >
            <Link to={DEMO_BOOKING_PATH}>Probar una página de reservas</Link>
          </Button>
        </div>
        <p className="lg:col-span-12">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center rounded-sm font-semibold underline decoration-hero-foreground/50 underline-offset-4 outline-none hover:decoration-current focus-visible:ring-3 focus-visible:ring-hero-foreground/60"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </section>
  );
}
