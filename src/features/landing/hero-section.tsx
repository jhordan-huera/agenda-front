import { CalendarCheck, IdCard, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingSample } from "./booking-sample";
import { DaySample } from "./day-sample";
import { DEMO_BOOKING_PATH } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/** Un enlace dentro de una frase: su zona para el dedo crece hasta 44 px de alto sin mover el texto. */
const INLINE_LINK = "relative rounded-sm outline-none before:absolute before:-inset-x-1 before:-inset-y-3.5 before:content-[''] focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * La portada (spec 030): el titular en tinta sólida, los dos botones y la línea de confianza y, debajo, la
 * pieza propia: el celular del paciente, que elige su hora desde el enlace de WhatsApp, sobre la hoja de
 * «Tu día», adonde llega la cita. En el celular se apilan. Con el registro cerrado, el botón principal es
 * «Quiero mi agenda» (spec 022).
 */
export function HeroSection({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="portada-titulo" className="bg-wall">
      <div className={cn(CONTAINER, "pt-10 pb-16 sm:pt-16 lg:pt-20 lg:pb-24")}>
        {/* Una frase por línea: con el equilibrado de los títulos, «su hora» quedaba partido. */}
        <h1 id="portada-titulo" className="max-w-4xl text-display font-bold text-foreground">
          <span className="block">Tus pacientes eligen su hora.</span> <span className="block">Tú solo atiendes.</span>
        </h1>

        <div className="mt-6 grid grid-cols-1 gap-10 lg:mt-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Comparte tu enlace por WhatsApp: cada paciente ve tus horas libres, reserva con su cédula y la cita llega a tu
              agenda al instante.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 px-6 text-base">
                <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" />
              </Button>
              <Button asChild variant="outline" className="h-12 px-5 text-base">
                <Link to={DEMO_BOOKING_PATH}>
                  <CalendarCheck className="text-ink" aria-hidden /> Probar una página de reservas
                </Link>
              </Button>
            </div>
          </div>

          <ul aria-label="Por qué confiar" className="divide-y divide-border border-y border-border text-[0.9375rem] lg:col-span-4 lg:col-start-9">
            <li className="flex min-h-12 items-center gap-3 py-2.5">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              Hecho en Ecuador
            </li>
            <li className="flex min-h-12 items-center gap-3 py-2.5">
              <IdCard className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              Tus pacientes no crean cuenta
            </li>
            <li className="flex min-h-12 items-center gap-3 py-2.5">
              <ShieldCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                Datos protegidos según la{" "}
                <Link to="/privacidad" className={cn(INLINE_LINK, "font-medium underline decoration-rule-strong underline-offset-4 hover:decoration-current")}>
                  LOPDP
                </Link>
              </span>
            </li>
          </ul>
        </div>

        <figure className="mt-14 lg:mt-16">
          {/* En el computador, el celular se apoya sobre la hoja, más abajo que su borde: está encima de ella. */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_2.5rem_minmax(0,1fr)] lg:items-start lg:gap-0">
            <BookingSample className="relative z-10 mx-auto w-full max-w-[18rem] lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mt-14 lg:max-w-none" />
            <DaySample className="lg:col-span-2 lg:col-start-2 lg:row-start-1 lg:pl-16" />
          </div>
          <figcaption className="mt-4 text-xs text-muted-foreground">
            <span className="sr-only">
              Ejemplo: Ana recibe por WhatsApp el enlace de su psicóloga, elige el jueves a las 11:00 sin crear cuenta y la cita
              llega a «Tu día», junto a los avisos de la reserva, del paciente que confirmó y del comprobante de pago.{" "}
            </span>
            Datos de ejemplo
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
