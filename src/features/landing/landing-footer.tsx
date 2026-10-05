import { Link } from "react-router";
import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants/app";

const CURRENT_YEAR = new Date().getFullYear();

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Logo />
        <nav aria-label="Pie de página" className="flex gap-5">
          <Link to="/login" className="hover:text-foreground">Iniciar sesión</Link>
          <Link to="/register" className="hover:text-foreground">Crear cuenta</Link>
          <Link to="/book/jhordan" className="hover:text-foreground">Página de reservas demo</Link>
          <Link to="/privacidad" className="hover:text-foreground">Privacidad</Link>
        </nav>
        <p>© {CURRENT_YEAR} {APP_NAME}</p>
      </div>
    </footer>
  );
}
