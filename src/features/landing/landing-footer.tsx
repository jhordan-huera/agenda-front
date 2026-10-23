import { MapPin, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH, LANDING_SECTIONS, TESTIMONIAL } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const CURRENT_YEAR = new Date().getFullYear();

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Funciones", to: `/#${LANDING_SECTIONS.highlights}` },
      { label: "Cómo avanza una cita", to: `/#${LANDING_SECTIONS.flow}` },
      { label: "Funciona con", to: `/#${LANDING_SECTIONS.integrations}` },
      // Sólo con un testimonio autorizado (landing-constants.ts).
      ...(TESTIMONIAL ? [{ label: "Lo que dicen", to: `/#${LANDING_SECTIONS.testimonial}` }] : []),
      { label: "Preguntas frecuentes", to: `/#${LANDING_SECTIONS.faq}` },
      { label: "Página de reservas de ejemplo", to: DEMO_BOOKING_PATH },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { label: "Iniciar sesión", to: "/login" },
      // Con el registro cerrado, «Quiero mi agenda» (spec 022).
      { label: "Crear cuenta", to: "/register" },
    ],
  },
  { title: "Legal", links: [{ label: "Privacidad", to: "/privacidad" }] },
];

/** Los sellos del pie: los mismos hechos de la portada, sin certificaciones inventadas. */
const BADGES: { icon: LucideIcon; label: string }[] = [
  { icon: MapPin, label: "Hecho en Ecuador" },
];

/** Cada enlace del pie ocupa 44 px de alto: se toca bien con el dedo. */
const LINK = "inline-flex min-h-11 items-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Pie de la portada (spec 032): el logotipo con su frase y tres columnas de enlaces (cuatro columnas en el
 * computador) y, en el renglón de abajo, el año y el sello «Hecho en Ecuador».
 */
export function LandingFooter({ signup }: { signup: SignupContact }) {
  return (
    <footer className="bg-card">
      <div className={cn(CONTAINER, "grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]")}>
        <div className="col-span-2 max-w-xs sm:col-span-3 md:col-span-1">
          <Logo className="min-h-11 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Agenda y reservas online para profesionales: tus pacientes eligen su hora y tú solo atiendes.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="flex min-h-11 items-center text-sm font-semibold">{column.title}</p>
            <ul className="text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {/* Las secciones de la portada son anclas de esta misma página. */}
                  {link.to.startsWith("/#") ? (
                    <a href={link.to.slice(1)} className={LINK}>
                      {link.label}
                    </a>
                  ) : link.to === "/register" ? (
                    <SignupLink contact={signup} registerLabel={link.label} className={LINK} />
                  ) : (
                    <Link to={link.to} className={LINK}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className={cn(CONTAINER, "flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between")}>
          <p className="text-sm text-muted-foreground">
            © {CURRENT_YEAR} {APP_NAME}
          </p>
          <ul aria-label="Sellos" className="flex flex-wrap gap-2">
            {BADGES.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                <Icon className="size-3.5 text-ink" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
