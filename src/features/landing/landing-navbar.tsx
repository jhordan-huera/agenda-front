import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LANDING_SECTIONS } from "./landing-constants";
import { SignupCta } from "./signup-link";
import type { SignupContact } from "./use-signup-contact";

const LINKS = [
  { href: `#${LANDING_SECTIONS.highlights}`, label: "Funciones" },
  { href: `#${LANDING_SECTIONS.flow}`, label: "Cómo avanza una cita" },
  { href: `#${LANDING_SECTIONS.integrations}`, label: "Funciona con" },
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
 * La barra de la portada (spec 032): una tarjeta blanca que flota arriba, separada del borde, con el
 * logotipo, los enlaces a las secciones, «Iniciar sesión» y el botón principal. Al bajar, su sombra crece
 * para despegarse de lo que pasa por debajo. Antes de todo, el salto al contenido para quien usa el
 * teclado. En el celular sólo caben el logotipo y el botón («Crear mi agenda», sin «gratis»).
 */
export function LandingNavbar({ signup }: { signup: SignupContact }) {
  const scrolled = useScrolled();
  return (
    <header className="sticky top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3">
      <a
        href="#contenido"
        className="sr-only rounded-md bg-card px-4 py-3 font-semibold text-ink shadow-sheet focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Ir al contenido
      </a>
      <div
        className={cn(
          "mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 rounded-2xl bg-card px-3 transition-shadow duration-200 sm:px-5",
          scrolled ? "shadow-lifted" : "shadow-sheet",
        )}
      >
        {/* En el celular, el logotipo y el botón, un poco más chicos: caben juntos desde 320 px. */}
        <Logo className="min-h-11 shrink-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:text-lg" />
        {/* Desde 1280 px: los cuatro enlaces no caben antes junto a los dos botones. */}
        <nav aria-label="Principal" className="hidden items-center gap-0.5 xl:flex">
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
          <Button asChild variant="outline" className="hidden h-11 px-4 text-[0.9375rem] sm:inline-flex">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <SignupCta
            contact={signup}
            // En un solo trozo: el botón es flex y separaría «gratis» con su espacio entre elementos.
            registerLabel={
              <span>
                Crear mi agenda<span className="hidden sm:inline"> gratis</span>
              </span>
            }
            className="h-11 px-3 text-sm sm:px-4 sm:text-[0.9375rem]"
          />
        </div>
      </div>
    </header>
  );
}
