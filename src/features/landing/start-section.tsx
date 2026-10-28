import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH, LANDING_SECTIONS } from "./landing-constants";
import { revealRef } from "./landing-motion";
import { PRIMARY_BUTTON, revealDelay, SECONDARY_BUTTON, TECH_LABEL, WIDE_HEADING } from "./landing-styles";
import { Accent } from "./landing-ui";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/**
 * El cierre (prueba en dev, 2026-10-27), como «Start crafting.» de getartcraft.com: centrado, con la
 * etiqueta arriba, el título enorme con su palabra en cursiva y los dos botones rectos.
 */
export function StartSection({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="titulo-empezar" id={LANDING_SECTIONS.start} className="border-b border-border px-5 py-24 text-center sm:py-36">
      <p ref={revealRef} data-reveal className={cn(TECH_LABEL, "text-muted-foreground")}>
        Gratis para empezar · Sin tarjeta
      </p>
      <h2
        id="titulo-empezar"
        ref={revealRef}
        data-reveal
        style={revealDelay(100)}
        className={cn(WIDE_HEADING, "mx-auto mt-6 max-w-4xl text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95]")}
      >
        Empieza a <Accent>agendar</Accent>.
      </h2>
      <p ref={revealRef} data-reveal style={revealDelay(200)} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Crea tu agenda y comparte tu enlace: tus pacientes pueden reservar desde hoy.
      </p>
      <div ref={revealRef} data-reveal style={revealDelay(300)} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
        <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" className={PRIMARY_BUTTON} />
        <Link to={DEMO_BOOKING_PATH} className={SECONDARY_BUTTON}>
          Probar una página de reservas
        </Link>
      </div>
    </section>
  );
}
