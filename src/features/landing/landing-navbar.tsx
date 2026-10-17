import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#caracteristicas", label: "Qué hace" },
  { href: "#tu-panel", label: "Tu panel" },
  { href: "#como-funciona", label: "Cómo empezar" },
];

/** Menú de la portada: una barra flotante y redondeada, del fondo del modo, con efecto cristal. */
export function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/80 px-4 shadow-[0_8px_30px_-14px_rgb(29_36_51/0.22)] backdrop-blur-md sm:px-5">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="lg" className="hidden sm:inline-flex">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="lg" className="px-4">
            <Link to="/register">Crear mi agenda</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
