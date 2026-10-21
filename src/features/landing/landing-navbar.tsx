import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { CONTAINER } from "./section-heading";
import { SignupLink } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const LINKS = [
  { href: `#${LANDING_SECTIONS.howItWorks}`, label: "Cómo funciona" },
  { href: `#${LANDING_SECTIONS.highlights}`, label: "Funciones" },
  { href: `#${LANDING_SECTIONS.faq}`, label: "Preguntas" },
];

/** Si la página ya bajó de su borde superior (el estado sólo cambia al cruzarlo). */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled;
}

/**
 * La barra de la portada (spec 030): fija arriba, del color de la pared y sin efecto de vidrio; al bajar
 * aparece su borde inferior. Antes de todo, el salto al contenido para quien usa el teclado.
 */
export function LandingNavbar({ signup }: { signup: SignupContact }) {
  const scrolled = useScrolled();
  return (
    <header className={cn("sticky top-0 z-40 border-b bg-wall transition-colors duration-200", scrolled ? "border-border" : "border-transparent")}>
      <a
        href="#contenido"
        className="sr-only rounded-md bg-card px-4 py-3 font-semibold text-ink shadow-sheet focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Ir al contenido
      </a>
      <div className={cn(CONTAINER, "flex h-16 items-center justify-between gap-4")}>
        <Logo className="min-h-11 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        {/* Desde 1024 px: en una tablet no caben junto a los dos botones. */}
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="inline-flex h-11 items-center rounded-md px-3 text-[0.9375rem] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden h-11 px-4 text-[0.9375rem] sm:inline-flex">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild className="h-11 px-4 text-[0.9375rem]">
            <SignupLink contact={signup} registerLabel="Crear mi agenda" />
          </Button>
        </div>
      </div>
    </header>
  );
}
