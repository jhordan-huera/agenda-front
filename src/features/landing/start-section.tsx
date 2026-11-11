import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH, LANDING_SECTIONS } from "./landing-constants";
import { BRAND_PANEL, CONTAINER, DISPLAY, PANEL_BUTTON, PANEL_OUTLINE_BUTTON } from "./landing-styles";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/**
 * El cierre (spec 043): un panel tomate más pequeño que el de arriba, centrado, con el título y los dos botones.
 * Con el registro cerrado, «Quiero mi agenda» (spec 022).
 */
export function StartSection({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="titulo-empezar" id={LANDING_SECTIONS.start} className={cn(CONTAINER, "pt-24 sm:pt-32")}>
      <div className={cn(BRAND_PANEL, "px-6 py-14 text-center sm:px-10 sm:py-20")}>
        <h2 id="titulo-empezar" className={cn(DISPLAY, "mx-auto max-w-[18ch] text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.04]")}>
          Empieza a agendar hoy.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-hero-foreground/90">
          Crea tu agenda y comparte tu enlace: tus pacientes pueden reservar desde hoy.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" className={PANEL_BUTTON} />
          <Link to={DEMO_BOOKING_PATH} className={PANEL_OUTLINE_BUTTON}>
            Ver una página de reservas
          </Link>
        </div>
        <p className="mt-6 text-sm text-hero-foreground/85">Gratis para empezar, sin tarjeta.</p>
      </div>
    </section>
  );
}
