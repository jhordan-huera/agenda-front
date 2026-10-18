import { ArrowRight, CalendarCheck } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { CalendarChips } from "./floating-chip";
import { HeroCalendar } from "./hero-calendar";
import { PRODUCT_FACTS } from "./product-facts";
import { Eyebrow, GradientText } from "./section-heading";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const PROFESSIONS = "psicólogos, odontólogos, nutricionistas, fisioterapeutas, entrenadores, estilistas y abogados";

/**
 * La portada: el titular con su final en degradado y, a la derecha, el calendario de la semana (la
 * reserva que entra) con etiquetas flotantes de lo que pasa: el aviso de la reserva, la confirmación
 * al cliente y el recordatorio. Con el registro cerrado, el botón principal es «Quiero mi agenda» (spec 022).
 */
export function HeroSection({ signup }: { signup: SignupContact }) {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(55%_45%_at_0%_0%,color-mix(in_oklch,var(--ink)_12%,transparent),transparent),radial-gradient(45%_45%_at_100%_8%,color-mix(in_oklch,var(--highlight)_55%,transparent),transparent)]">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-16 px-4 pt-32 pb-16 sm:px-6 sm:pt-36 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:pb-20">
        <div className="max-w-xl">
          <Eyebrow>
            {/* El punto verde de «en línea», igual en los dos modos: se ve sobre los dos fondos (spec 019). */}
            <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
            Agenda y reservas online
          </Eyebrow>
          <h1 className="mt-6 text-[2.6rem] leading-[1.04] font-extrabold tracking-[-0.025em] sm:text-6xl">
            Tus clientes eligen su hora. <GradientText>Tú solo atiendes.</GradientText>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Comparte tu enlace por WhatsApp: cada persona ve tus horas libres, reserva con su cédula y recibe la
            confirmación por email. La cita aparece en tu agenda al instante.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <SignupLink contact={signup} registerLabel="Crear mi agenda gratis" after={<ArrowRight />} />
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-ink/40 bg-background/70 px-5 text-base text-ink hover:bg-background hover:text-ink dark:border-ink/40">
              <Link to="/book/jhordan">
                <CalendarCheck /> Probar una página de reservas
              </Link>
            </Button>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
            {PRODUCT_FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse">
                <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                <dd className="text-2xl font-extrabold tracking-[-0.02em]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <HeroCalendar />
          <CalendarChips />
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-12 text-center text-muted-foreground sm:px-6">Hecho para {PROFESSIONS}.</p>
    </section>
  );
}

