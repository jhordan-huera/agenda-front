import { Link, Outlet } from "react-router";
import { Logo } from "@/components/shared/logo";
import { AuthShowcase } from "@/features/auth/auth-showcase";
import { RedirectIfAuthenticated } from "@/features/auth/redirect-if-authenticated";
import { useInstallableApp } from "@/features/install/use-installable-app";
import { APP_NAME } from "@/lib/constants/app";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Marco de las pantallas de acceso (login, registro y recuperación), al estilo de la portada: el
 * formulario sobre un degradado suave y, en escritorio, el panel de la marca fijo a la derecha
 * (se queda en su sitio mientras se desplaza un formulario largo, como el registro).
 */
export function AuthLayout() {
  useInstallableApp();
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <RedirectIfAuthenticated />
      <div className="flex min-w-0 flex-col bg-[radial-gradient(70%_45%_at_0%_0%,color-mix(in_oklch,var(--ink)_10%,transparent),transparent),radial-gradient(50%_35%_at_100%_100%,color-mix(in_oklch,var(--highlight)_45%,transparent),transparent)] px-4 py-6 sm:px-10">
        <Logo className="self-start" />
        <main className="flex flex-1 items-center justify-center py-8">
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
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh lg:p-3">
        <AuthShowcase />
      </div>
    </div>
  );
}
