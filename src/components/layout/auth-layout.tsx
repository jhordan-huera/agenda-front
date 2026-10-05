import { Link, Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { RedirectIfAuthenticated } from "@/features/auth/redirect-if-authenticated";
import { AgendaWeek } from "@/features/auth/agenda-week";
import { APP_NAME } from "@/lib/constants/app";

const CURRENT_YEAR = new Date().getFullYear();

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <RedirectIfAuthenticated />
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </main>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            © {CURRENT_YEAR} {APP_NAME}
          </span>
          <Link to="/privacidad" className="hover:text-foreground hover:underline">
            Política de privacidad
          </Link>
        </p>
      </div>
      {/* Lo que espera al entrar: la semana en la agenda, con la reserva que llegó sola. */}
      <aside className="hidden border-l bg-muted lg:flex lg:items-center lg:justify-center lg:px-12">
        <div className="w-full max-w-lg">
          <AgendaWeek />
        </div>
      </aside>
    </div>
  );
}
