import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { HeroAgenda } from "./hero-agenda";

const PROFESSIONS = "psicólogos, odontólogos, nutricionistas, fisioterapeutas, entrenadores, estilistas y abogados";

/** La portada: el escritorio del consultorio en salvia pastel, con la hoja del día encima. */
export function HeroSection() {
  return (
    <section className="overflow-hidden bg-accent">
      <div className="mx-auto grid max-w-6xl gap-16 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-center lg:gap-16 lg:pt-20 lg:pb-28">
        <div className="max-w-xl">
          <h1 className="text-[2.6rem] leading-[1.04] font-extrabold tracking-[-0.025em] sm:text-6xl">
            Tus clientes eligen su hora. Tú solo atiendes.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Comparte tu enlace por WhatsApp: cada persona ve tus horas libres, reserva con su cédula y recibe la
            confirmación por email. La cita aparece en tu agenda al instante.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/register">Crear mi agenda gratis</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 px-4 text-base text-ink hover:bg-background/60">
              <Link to="/book/jhordan">Probar una página de reservas</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Gratis para empezar, sin tarjeta de crédito.</p>
        </div>
        <HeroAgenda />
      </div>
      <div className="border-t border-ink/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-muted-foreground sm:px-6">Hecho para {PROFESSIONS}.</p>
      </div>
    </section>
  );
}
