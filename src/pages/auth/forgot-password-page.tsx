import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router";
import { PageTitle } from "@/components/shared/page-title";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { APP_NAME, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";

/** Cada forma de contacto ocupa una fila entera de 48 px: se toca bien con el dedo. */
const CONTACT_ROW =
  "flex min-h-12 items-center gap-3 px-4 font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&_svg]:size-4 [&_svg]:shrink-0";

/** Las contraseñas las pone el soporte de la plataforma: no hay recuperación automática por email. */
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
        description="Escríbenos desde el email de tu cuenta y te enviaremos una contraseña nueva."
      />
      <p className="text-sm font-medium">Contacta al soporte</p>
      {/* Las filas, hundidas en el papel como los trozos de la app de la portada. */}
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl bg-wall ring-1 ring-border">
        {settings.isPending ? (
          <div className="flex min-h-12 items-center px-4">
            <Skeleton className="h-5 w-48" />
          </div>
        ) : (
          <a href={`mailto:${supportEmail}`} className={CONTACT_ROW}>
            <Mail className="text-muted-foreground" aria-hidden />{" "}
            <span className="min-w-0 truncate">{supportEmail}</span>
          </a>
        )}
        {whatsAppUrl && (
          <a href={whatsAppUrl} target="_blank" rel="noreferrer" className={CONTACT_ROW}>
            <WhatsAppIcon /> {supportPhone}
          </a>
        )}
      </div>
      <Link
        to="/login"
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver a iniciar sesión
      </Link>
    </>
  );
}
