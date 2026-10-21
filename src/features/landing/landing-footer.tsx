import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants/app";
import { DEMO_BOOKING_PATH, LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const CURRENT_YEAR = new Date().getFullYear();

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", to: `/#${LANDING_SECTIONS.howItWorks}` },
      { label: "Funciones", to: `/#${LANDING_SECTIONS.highlights}` },
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

/** Cada enlace del pie ocupa 44 px de alto: se toca bien con el dedo. */
const LINK = "inline-flex min-h-11 items-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/** Pie de la portada (spec 030): claro, en el tono del mostrador, con un renglón arriba. */
export function LandingFooter({ signup }: { signup: SignupContact }) {
  return (
    <footer className="border-t border-border bg-counter">
      <div className={`${CONTAINER} grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]`}>
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
        <p className={`${CONTAINER} py-6 text-sm text-muted-foreground`}>
          © {CURRENT_YEAR} {APP_NAME}. Hecho en Ecuador.
        </p>
      </div>
    </footer>
  );
}
