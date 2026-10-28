import { Link } from "react-router";
import { BrandMark } from "@/components/shared/brand-mark";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { DEMO_BOOKING_PATH, LANDING_SECTIONS, TESTIMONIAL } from "./landing-constants";
import { FRAME, TECH_LABEL } from "./landing-styles";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const CURRENT_YEAR = new Date().getFullYear();

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Funciones", to: `/#${LANDING_SECTIONS.features}` },
      { label: "Tus datos", to: `/#${LANDING_SECTIONS.data}` },
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

/** Cada enlace del pie ocupa 44 px de alto: se toca bien con el dedo. */
const LINK =
  "inline-flex min-h-11 items-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * El pie (prueba en dev, 2026-10-27), como el de getartcraft.com: dentro del marco, una casilla por
 * columna separadas por líneas, los títulos en mayúsculas monoespaciadas y, abajo, el año y «Hecho en
 * Ecuador».
 */
export function LandingFooter({ signup }: { signup: SignupContact }) {
  return (
    <footer className={cn(FRAME, "mb-0")}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
        <div className="border-b border-border p-6 sm:col-span-2 sm:p-8 lg:col-span-1 lg:border-r lg:border-b-0">
          <Link to="/" aria-label={APP_NAME} className="inline-flex rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <BrandMark className="size-9" />
          </Link>
          <p className="mt-4 max-w-xs leading-relaxed text-muted-foreground">
            Agenda y reservas online para profesionales: tus pacientes eligen su hora y tú solo atiendes.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="border-border p-6 not-last:border-b sm:p-8 lg:not-last:border-r lg:not-last:border-b-0">
            <p className={cn(TECH_LABEL, "text-muted-foreground")}>{column.title}</p>
            <ul className="mt-3">
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
      <div className={cn(TECH_LABEL, "flex flex-col gap-2 border-t border-border px-6 py-5 text-muted-foreground sm:flex-row sm:justify-between sm:px-8")}>
        <p>
          © {CURRENT_YEAR} {APP_NAME}
        </p>
        <p>Hecho en Ecuador, para profesionales</p>
      </div>
    </footer>
  );
}
