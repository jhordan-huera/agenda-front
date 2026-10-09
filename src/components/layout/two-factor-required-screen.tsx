import { LogOut, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/use-session";
import { TwoFactorSettings } from "@/features/settings/two-factor-settings";
import { useSignOut } from "./use-sign-out";

/**
 * Lo ve el super admin sin la verificación en dos pasos (obligatoria) en lugar del panel /admin: la API
 * rechaza el panel y el modo soporte (`two_factor_required`) hasta que la active. Al terminar, la sesión
 * se vuelve a leer y aparece el panel.
 */
export function TwoFactorRequiredScreen() {
  const { refresh } = useSession();
  const signOut = useSignOut();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-10">
      <PageTitle title="Activa la verificación en dos pasos" />
      <Logo />
      <div className="grid w-full max-w-lg gap-4">
        <div className="rounded-2xl border bg-background p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Activa la verificación en dos pasos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Es obligatoria para las cuentas de super admin: con ellas se ven todos los negocios y sus historias clínicas.
            Necesitas una app de autenticación en tu celular (Google Authenticator, Microsoft Authenticator…). Son un par de
            minutos y luego entras al panel.
          </p>
        </div>
        <TwoFactorSettings onEnabled={() => void refresh()} />
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
