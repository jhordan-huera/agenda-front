import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { BrandMark } from "@/components/shared/brand-mark";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";
import { TRACKED_SECTIONS } from "./landing-constants";
import { riseDelay, TECH_LABEL } from "./landing-styles";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const NAV_LINK = cn(
  TECH_LABEL,
  "rounded-[2px] px-2 py-1 text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
);

/**
 * La barra de arriba (prueba en dev, 2026-10-27), al estilo de getartcraft.com: el símbolo en su casilla,
 * las secciones en mayúsculas monoespaciadas, con la actual en un recuadro, y «Crear mi agenda» como un
 * bloque al borde. Sus piezas entran escalonadas al cargar. En el celular, las secciones van en un menú.
 */
export function LandingNav({ signup, active }: { signup: SignupContact; active: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-wall/85 backdrop-blur-md print:hidden">
      <a
        href="#contenido"
        className={cn(TECH_LABEL, "sr-only z-50 bg-foreground px-4 py-3 text-background focus:not-sr-only focus:absolute focus:top-2 focus:left-2")}
      >
        Saltar al contenido
      </a>
      <nav aria-label="Principal" className="flex h-12 items-stretch">
        <Link
          to="/"
          aria-label={APP_NAME}
          className="flex w-14 shrink-0 items-center justify-center border-r border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <BrandMark className="size-6" />
        </Link>
        <ul className="hidden items-center gap-1 px-4 md:flex">
          {TRACKED_SECTIONS.map((section, index) => (
            <li key={section.id} className="landing-rise" style={riseDelay(500 + index * 70)}>
              <a
                href={`#${section.id}`}
                aria-current={active === section.id ? "true" : undefined}
                className={cn(NAV_LINK, active === section.id && "bg-foreground text-background hover:text-background")}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-stretch">
          <Link
            to="/login"
            className={cn(
              TECH_LABEL,
              "landing-rise hidden items-center border-l border-border px-5 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:flex",
            )}
            style={riseDelay(800)}
          >
            Iniciar sesión
          </Link>
          <SignupLink
            contact={signup}
            registerLabel="Crear mi agenda"
            className={cn(
              TECH_LABEL,
              "flex items-center bg-foreground px-4 text-background transition-colors outline-none hover:bg-ink hover:text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-inset sm:px-6",
            )}
          />
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="menu-portada"
            aria-label={open ? "Cerrar el menú" : "Abrir el menú"}
            className="flex w-12 items-center justify-center border-l border-border outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <ul id="menu-portada" className="border-t border-border bg-wall px-2 py-2 md:hidden">
          {TRACKED_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} onClick={() => setOpen(false)} className={cn(NAV_LINK, "flex min-h-11 items-center px-3")}>
                {section.label}
              </a>
            </li>
          ))}
          <li>
            <Link to="/login" className={cn(NAV_LINK, "flex min-h-11 items-center px-3")}>
              Iniciar sesión
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
