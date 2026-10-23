import { CalendarCheck, IdCard, MapPin, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { LogoMark } from "@/components/shared/logo";
import { NewBookingNotice, WeekSample } from "@/components/shared/week-sample";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupCta } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

/** Un sello de confianza: una píldora blanca con su icono en el color de la marca. Sólo hechos reales. */
function TrustChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="inline-flex min-h-9 items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-sm text-muted-foreground shadow-sheet">
      <Icon className="size-4 shrink-0 text-ink" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/** El menú del panel en la vista de ejemplo: el de verdad (sin «Profesionales», que es de las clínicas), con la Agenda abierta. */
const MENU = NAV_ITEMS.filter((item) => !item.multiAgenda);

/**
 * La vista del panel (spec 032): el marco de una ventana con el panel por dentro, el lienzo gris con el
 * menú lateral (desde tablet) y la semana de la Agenda, la misma del acceso; encima, el aviso de la
 * reserva online que acaba de entrar. Nada se sale del marco. Es decorativa: el texto para el lector de
 * pantalla va en su `figcaption`, con «Datos de ejemplo» a la vista.
 */
function PanelPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("mx-auto max-w-5xl text-left", className)}>
      <div className="relative">
        <div aria-hidden className="rounded-[1.25rem] bg-card p-1.5 shadow-lifted sm:p-2">
          <div className="flex gap-3 rounded-xl bg-canvas p-2 ring-1 ring-border sm:p-3">
            <div className="hidden w-48 shrink-0 flex-col rounded-xl bg-card p-3 shadow-sheet md:flex">
              <LogoMark className="px-1.5 pt-1 pb-3 text-base" markClassName="size-6" />
              <ul className="space-y-0.5 text-sm">
                {MENU.map(({ to, label, icon: Icon }) => {
                  const active = to === "/dashboard/calendar";
                  return (
                    <li
                      key={to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
                        active ? "bg-accent font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <Icon className={cn("size-4", active && "text-ink")} />
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <WeekSample className="min-w-0 flex-1 p-3 shadow-sheet sm:p-5" />
          </div>
        </div>
        <NewBookingNotice className="absolute -bottom-6 left-4 sm:left-8 md:left-60" />
      </div>
      <figcaption className="mt-10 text-center text-xs text-muted-foreground">
        <span className="sr-only">
          Ejemplo: la semana de la Agenda, con las citas atendidas, las confirmadas y las pendientes, y el aviso de una reserva
          online nueva de Ana Torres para el jueves a las 10:00.{" "}
        </span>
        Datos de ejemplo
      </figcaption>
    </figure>
  );
}

/**
 * La portada (spec 032), centrada: los dos sellos reales (sin la LOPDP, a pedido del dueño del producto), el titular en dos frases (la segunda en el color
 * de la marca, sin degradado), la frase de apoyo, el botón principal y el de la página de reservas de
 * ejemplo, la línea «Gratis para empezar» y, debajo, la vista del panel. Con el registro cerrado, el botón
 * principal es «Quiero mi agenda» (spec 022).
 */
export function HeroSection({ signup }: { signup: SignupContact }) {
  return (
    <section aria-labelledby="portada-titulo">
      <div className={cn(CONTAINER, "pt-12 pb-16 text-center sm:pt-20 sm:pb-20 lg:pt-24")}>
        <ul aria-label="Por qué confiar" className="flex flex-wrap justify-center gap-2">
          <TrustChip icon={MapPin}>Hecho en Ecuador</TrustChip>
          <TrustChip icon={IdCard}>Tus pacientes no crean cuenta</TrustChip>
        </ul>

        {/* Una frase por línea: con el equilibrado de los títulos, «su hora» quedaba partido. */}
        <h1 id="portada-titulo" className="mx-auto mt-8 max-w-4xl text-display font-bold text-foreground sm:mt-10">
          <span className="block">Tus pacientes eligen su hora.</span> <span className="block text-ink">Tú solo atiendes.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Comparte tu enlace por WhatsApp: cada paciente ve tus horas libres, reserva con su cédula y la cita llega a tu agenda
          al instante.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <SignupCta contact={signup} arrow className="h-12 px-6 text-base" />
          <Button asChild variant="outline" className="h-12 px-5 text-base">
            <Link to={DEMO_BOOKING_PATH}>
              <CalendarCheck className="text-ink" aria-hidden /> Probar una página de reservas
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Gratis para empezar · Sin tarjeta</p>

        <PanelPreview className="mt-14 sm:mt-16" />
      </div>
    </section>
  );
}
