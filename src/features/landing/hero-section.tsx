import { ArrowRight, BellRing, CalendarCheck, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroAgenda } from "./hero-agenda";
import { Eyebrow, GradientText } from "./section-heading";

const PROFESSIONS = "psicólogos, odontólogos, nutricionistas, fisioterapeutas, entrenadores, estilistas y abogados";

/** Lo que es cierto de la app, en cifras cortas (sin inventar usuarios ni porcentajes). */
const FACTS = [
  { value: "24/7", label: "Reservas online" },
  { value: "Gratis", label: "Para empezar" },
  { value: "Sin cuenta", label: "Tus clientes reservan solos" },
];

/**
 * La portada: el titular con su final en degradado y, a la derecha, la hoja del día (la reserva que
 * entra) con dos etiquetas flotantes de lo que pasa después: la confirmación y el recordatorio.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(55%_45%_at_0%_0%,color-mix(in_oklch,var(--ink)_12%,transparent),transparent),radial-gradient(45%_45%_at_100%_8%,color-mix(in_oklch,var(--highlight)_55%,transparent),transparent)]">
      <div className="mx-auto grid max-w-6xl gap-16 px-4 pt-32 pb-16 sm:px-6 sm:pt-36 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:pb-20">
        <div className="max-w-xl">
          <Eyebrow>
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
              <Link to="/register">
                Crear mi agenda gratis <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-ink/40 bg-white/70 px-5 text-base text-ink hover:bg-white hover:text-ink">
              <Link to="/book/jhordan">
                <CalendarCheck /> Probar una página de reservas
              </Link>
            </Button>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse">
                <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                <dd className="text-2xl font-extrabold tracking-[-0.02em]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <HeroAgenda />
          <FloatingChip className="-top-6 right-0 sm:-right-5" delay={2.2}>
            <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
            <span className="text-sm font-semibold">Confirmación enviada</span>
          </FloatingChip>
          <FloatingChip className="-right-2 -bottom-8 sm:-right-6" delay={2.6}>
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <BellRing className="size-4" aria-hidden />
            </span>
            <span className="text-sm leading-tight">
              <span className="block font-semibold">Recordatorio</span>
              <span className="block text-xs text-muted-foreground">Antes de cada cita</span>
            </span>
          </FloatingChip>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-12 text-center text-muted-foreground sm:px-6">Hecho para {PROFESSIONS}.</p>
    </section>
  );
}

/** Etiqueta que flota junto a la hoja del día (decorativa: lo mismo lo cuenta el texto). */
function FloatingChip({ className, delay, children }: { className: string; delay: number; children: ReactNode }) {
  return (
    <div
      aria-hidden
      style={{ animationDelay: `${delay}s` }}
      className={cn(
        "absolute z-10 hidden items-center gap-2.5 rounded-xl border border-border/70 bg-white/95 px-3.5 py-2.5 shadow-[0_14px_30px_-14px_rgb(29_36_51/0.35)] backdrop-blur animate-in fill-mode-both duration-500 fade-in slide-in-from-bottom-2 motion-reduce:animate-none sm:flex",
        className,
      )}
    >
      {children}
    </div>
  );
}
