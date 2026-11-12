import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { BrandMark } from "@/components/shared/brand-mark";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { TRACKED_SECTIONS } from "./landing-constants";
import { CONTAINER, INK_BUTTON } from "./landing-styles";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const NAV_LINK =
  "font-display inline-flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

/**
 * La barra de arriba (spec 043): el logo con el nombre, las secciones de la página en el centro, «Iniciar sesión» y
 * «Crear mi agenda» (con el registro cerrado, «Quiero mi agenda», spec 022). Se queda arriba al bajar. En el
 * celular, el logo y el botón, y las secciones en un menú. `sections`: las de la página (por defecto, las de la
 * portada; las páginas por especialidad, spec 041, las suyas). Los enlaces llevan a `/#…` desde cualquier página.
 */
export function LandingNav({
  signup,
  active,
  sections = TRACKED_SECTIONS,
}: {
  signup: SignupContact;
  active: string | null;
  sections?: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-wall/90 backdrop-blur-md print:hidden">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-foreground px-4 py-3 text-background focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <nav aria-label="Principal" className={cn(CONTAINER, "flex h-[4.5rem] items-center gap-2")}>
        <Link to="/" aria-label={APP_NAME} className="font-display flex shrink-0 items-center gap-2.5 rounded-lg pr-2 text-xl font-extrabold tracking-[-0.02em] outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <BrandMark className="size-8" />
          {/* En las pantallas más angostas (320 px) sólo cabe el símbolo junto al botón y el menú. */}
          <span className="max-[379px]:sr-only">{APP_NAME}</span>
        </Link>
        <ul className="mx-auto hidden items-center gap-1 md:flex">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(NAV_LINK, active === section.id && "text-foreground")}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link to="/login" className={cn(NAV_LINK, "hidden text-foreground sm:inline-flex")}>
            Iniciar sesión
          </Link>
          <SignupLink contact={signup} registerLabel="Crear mi agenda" className={INK_BUTTON} />
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="menu-portada"
            aria-label={open ? "Cerrar el menú" : "Abrir el menú"}
            className="flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <ul id="menu-portada" className={cn(CONTAINER, "border-t border-border pb-3 md:hidden")}>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} onClick={() => setOpen(false)} className={cn(NAV_LINK, "w-full")}>
                {section.label}
              </a>
            </li>
          ))}
          <li>
            <Link to="/login" className={cn(NAV_LINK, "w-full")}>
              Iniciar sesión
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
