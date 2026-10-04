import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#caracteristicas", label: "Características" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#precios", label: "Precios" },
];

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="lg" className="hidden sm:inline-flex">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/register">Comenzar gratis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
