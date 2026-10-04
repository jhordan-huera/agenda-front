import { LockKeyhole } from "lucide-react";
import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { RegisterForm } from "@/features/auth/register-form";
import { usePlatformSettings } from "@/hooks/queries/use-admin";

export default function RegisterPage() {
  const settings = usePlatformSettings();

  if (settings.isPending) {
    return (
      <div className="grid gap-5" role="status" aria-label="Cargando">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Si el super admin cerró el registro, las cuentas sólo se crean desde el panel de plataforma.
  if (settings.data && !settings.data.allowPublicSignup) {
    return (
      <>
        <PageTitle title="Registro cerrado" />
        <div className="flex flex-col items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <LockKeyhole className="size-5" aria-hidden />
          </span>
          <AuthCardHeader
            title="El registro está cerrado"
            description={
              <>
                Por ahora las cuentas nuevas las crea el equipo de la plataforma. Escríbenos a{" "}
                <a href={`mailto:${settings.data.supportEmail}`} className="font-medium text-primary hover:underline">
                  {settings.data.supportEmail}
                </a>{" "}
                y te daremos acceso.
              </>
            }
          />
          <Button asChild variant="outline">
            <Link to="/login">Ya tengo cuenta</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Crear cuenta" />
      <AuthCardHeader
        title="Crea tu cuenta gratis"
        description={
          <>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </>
        }
      />
      <RegisterForm />
    </>
  );
}
