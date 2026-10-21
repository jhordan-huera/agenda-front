import { LockKeyhole } from "lucide-react";
import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { SupportContact } from "@/components/shared/support-contact";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { AUTH_LINK } from "@/features/auth/auth-styles";
import { RegisterForm } from "@/features/auth/register-form";
import { SignupLink } from "@/features/landing/signup-link";
import { useSignupContact } from "@/features/landing/use-signup-contact";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { APP_NAME } from "@/lib/constants/app";

export default function RegisterPage() {
  const settings = usePlatformSettings();
  const signup = useSignupContact();

  // Mientras llega la configuración: la forma del formulario.
  if (settings.isPending) {
    return (
      <div role="status" aria-label="Cargando">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-5 w-44" />
        <div className="mt-8 grid gap-5">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
    );
  }

  // Si el super admin cerró el registro, las cuentas sólo se crean desde el panel de plataforma.
  if (settings.data && !settings.data.allowPublicSignup) {
    return (
      <>
        <PageTitle title="Registro cerrado" />
        <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-accent text-ink">
          <LockKeyhole className="size-5" aria-hidden />
        </span>
        <AuthCardHeader
          title="El registro está cerrado"
          description={
            <>
              Por ahora las cuentas nuevas las crea el equipo de la plataforma. Escríbenos a{" "}
              <SupportContact
                email={settings.data.supportEmail}
                phone={settings.data.supportPhone}
                message={`Hola, quiero crear una cuenta en ${APP_NAME}.`}
              />{" "}
              y te daremos acceso.
            </>
          }
        />
        {/* El mismo «Quiero mi agenda» de la portada (spec 022): el WhatsApp o el email de soporte, ya escrito. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {signup.kind !== "register" && (
            <Button asChild className="h-11 px-5 text-base">
              <SignupLink contact={signup} registerLabel={null} />
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 px-5 text-base">
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
            <Link to="/login" className={AUTH_LINK}>
              Inicia sesión
            </Link>
          </>
        }
      />
      <RegisterForm />
    </>
  );
}
