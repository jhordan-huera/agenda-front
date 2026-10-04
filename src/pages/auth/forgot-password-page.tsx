import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";

/** Las contraseñas las pone el soporte de la plataforma: no hay recuperación automática por email. */
export default function ForgotPasswordPage() {
  const settings = usePlatformSettings();
  const supportEmail = settings.data?.supportEmail ?? DEFAULT_SUPPORT_EMAIL;

  return (
    <>
      <PageTitle title="Recuperar el acceso" />
      <AuthCardHeader
        title="¿Olvidaste tu contraseña?"
        description="Escríbenos desde el email de tu cuenta y te enviaremos una contraseña nueva."
      />
      <div className="rounded-xl border bg-muted/40 p-6 text-center">
        <Mail className="mx-auto size-10 text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Contacta al soporte:</p>
        {settings.isPending ? (
          <Skeleton className="mx-auto mt-2 h-5 w-48" />
        ) : (
          <a href={`mailto:${supportEmail}`} className="mt-1 inline-block font-medium text-primary hover:underline">
            {supportEmail}
          </a>
        )}
      </div>
      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver a iniciar sesión
      </Link>
    </>
  );
}
