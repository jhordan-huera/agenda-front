import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { APP_NAME, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Sin recuperación automática por email: el soporte comprueba quién es y le envía un enlace de un solo
 * uso para que defina una contraseña nueva (/definir-contrasena).
 */
export default function ForgotPasswordPage() {
  const settings = usePlatformSettings();
  const supportEmail = settings.data?.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
  const supportPhone = settings.data?.supportPhone ?? "";
  const whatsAppUrl = supportPhone
    ? getSupportWhatsAppUrl(supportPhone, `Hola, necesito recuperar el acceso a mi cuenta de ${APP_NAME}.`)
    : null;

  return (
    <>
      <PageTitle title="Recuperar el acceso" />
      <AuthCardHeader
        title="¿Olvidaste tu contraseña?"
        description="Escríbenos desde el email de tu cuenta y te enviaremos un enlace para que definas una contraseña nueva."
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
        {whatsAppUrl && (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 font-medium text-primary hover:underline"
          >
            <WhatsAppIcon className="size-4" /> {supportPhone}
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
