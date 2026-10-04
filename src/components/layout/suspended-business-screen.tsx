import { LogOut, Mail, PauseCircle } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { useSignOut } from "./use-sign-out";

/** Lo ven los miembros de un negocio suspendido por el super admin en lugar del panel. */
export function SuspendedBusinessScreen() {
  const { data: settings } = usePlatformSettings();
  const signOut = useSignOut();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 p-4">
      <PageTitle title="Negocio suspendido" />
      <Logo />
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <PauseCircle className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Tu negocio está suspendido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El acceso a la agenda y la página de reservas están pausados. Tus datos se conservan y vuelven a estar
          disponibles en cuanto se reactive la cuenta.
        </p>
        {settings && (
          <Button asChild variant="outline" className="mt-6">
            <a href={`mailto:${settings.supportEmail}`}>
              <Mail /> Escribir a {settings.supportEmail}
            </a>
          </Button>
        )}
        <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
