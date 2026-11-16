import { Link, Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { AuthShowcase } from "@/features/auth/auth-showcase";
import { RedirectIfAuthenticated } from "@/features/auth/redirect-if-authenticated";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { APP_NAME } from "@/lib/constants/app";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();

/** El foco de los enlaces del marco: el anillo de la marca, como en la portada. */
const FOCUS = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Marco de las pantallas de acceso (login, registro y recuperación), spec 030: el formulario directo sobre el
 * papel, sin tarjeta, con el logotipo arriba y el pie abajo; en el computador, a la derecha, el panel de la
 * marca, fijo mientras se desplaza un formulario largo (el registro). En el celular, sólo el formulario,
 * arriba, para que el login quepa sin desplazarse.
 */
export function AuthLayout() {
  useInstallableApp();
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <RedirectIfAuthenticated />
      <div className="flex min-w-0 flex-col px-4 pt-3 sm:px-10 lg:px-12 xl:px-16">
        <header className="flex h-14 shrink-0 items-center">
          <Logo className={cn("min-h-11", FOCUS)} />
        </header>
        <main className="flex flex-1 items-start justify-center pt-6 pb-10 sm:items-center sm:py-12">
          <div className="w-full max-w-[25rem]">
            <Outlet />
          </div>
        </main>
        <footer className="flex flex-wrap items-center gap-x-5 pb-3 text-sm text-muted-foreground">
          <span>
            © {CURRENT_YEAR} {APP_NAME}
          </span>
          <Link
            to="/privacidad"
            className={cn("inline-flex min-h-11 items-center rounded-sm hover:text-foreground hover:underline", FOCUS)}
          >
            Política de privacidad
          </Link>
        </footer>
      </div>
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <AuthShowcase />
      </div>
    </div>
  );
}
