import { ArrowLeft, CircleAlert, Mail, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { FormField } from "@/components/shared/form-field";
import { PageTitle } from "@/components/shared/page-title";
import { SubmitButton } from "@/components/shared/submit-button";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { loadAuthSchemas } from "@/features/auth/auth-schemas";
import { FORM_ALERT } from "@/features/auth/auth-styles";
import { CAPTCHA_BOX_CLASS, useCaptcha } from "@/features/booking/use-captcha";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { useCaptchaSiteKey } from "@/hooks/queries/use-public-booking";
import { authService } from "@/lib/auth";
import { APP_NAME, DEFAULT_SUPPORT_EMAIL } from "@/lib/constants/app";
import { getErrorMessage } from "@/lib/data";
import { validate } from "@/lib/validations/validate";
import { getSupportWhatsAppUrl } from "@/lib/whatsapp";

/** Cada forma de contacto ocupa una fila entera de 48 px: se toca bien con el dedo. */
const CONTACT_ROW =
  "flex min-h-12 items-center gap-3 px-4 font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&_svg]:size-4 [&_svg]:shrink-0";

/** Lo que responde siempre, exista o no la cuenta (spec 054: nadie puede averiguar qué emails están registrados). */
const SENT_MESSAGE = "Si ese email tiene una cuenta, te enviamos una contraseña temporal. Revisa tu bandeja de entrada y el correo no deseado.";

/**
 * «¿Olvidaste tu contraseña?» (spec 054, pedido del dueño el 2026-11-20): el equipo del consultorio y el super admin
 * piden una contraseña temporal por email. Sirve una vez y vence en 1 hora; al entrar con ella se crea la propia. Debajo
 * sigue el contacto del soporte, por si el email no llega.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  // CAPTCHA (casi siempre invisible), si está activo: el pedido envía un email.
  const siteKey = useCaptchaSiteKey();
  const { containerRef: captchaRef, getToken: getCaptchaToken } = useCaptcha(siteKey.data ?? null);

  useEffect(() => {
    loadAuthSchemas().catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    let schemas;
    try {
      schemas = await loadAuthSchemas();
    } catch (loadError) {
      setFormError(getErrorMessage(loadError));
      return;
    }
    const result = validate(schemas.forgotPasswordSchema, { email });
    setError(result.errors.email);
    if (!result.success) return;
    setPending(true);
    try {
      await authService.requestTemporaryPassword({ email: result.data.email, captchaToken: await getCaptchaToken() });
      setSent(true);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageTitle title="Recuperar el acceso" />
      {sent ? (
        <>
          <AuthCardHeader title="Revisa tu correo" description={SENT_MESSAGE} />
          <div className="flex items-start gap-3 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              La contraseña temporal sirve una sola vez y vence en 1 hora. Al entrar con ella te pediremos crear una nueva. Tu
              contraseña de siempre sigue funcionando mientras tanto.
            </p>
          </div>
        </>
      ) : (
        <>
          <AuthCardHeader
            title="¿Olvidaste tu contraseña?"
            description="Escribe el email de tu cuenta y te enviaremos una contraseña temporal para entrar."
          />
          <form onSubmit={submit} noValidate className="grid gap-5">
            {formError && (
              <p role="alert" className={FORM_ALERT}>
                <CircleAlert aria-hidden />
                {formError}
              </p>
            )}
            <FormField label="Email" error={error}>
              {(field) => (
                <Input
                  {...field}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  className="h-11"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </FormField>
            <div>
              <div ref={captchaRef} className={CAPTCHA_BOX_CLASS} />
              <SubmitButton size="lg" className="h-11 w-full text-base" loading={pending} loadingText="Enviando…">
                Enviar contraseña temporal
              </SubmitButton>
            </div>
          </form>
        </>
      )}
      <SupportContact />
      <Link
        to="/login"
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver a iniciar sesión
      </Link>
    </>
  );
}

/** Si el email no llega: el contacto del soporte, como antes de la spec 054. */
function SupportContact() {
  const settings = usePlatformSettings();
  const supportEmail = settings.data?.supportEmail ?? DEFAULT_SUPPORT_EMAIL;
  const supportPhone = settings.data?.supportPhone ?? "";
  const whatsAppUrl = supportPhone
    ? getSupportWhatsAppUrl(supportPhone, `Hola, necesito recuperar el acceso a mi cuenta de ${APP_NAME}.`)
    : null;

  return (
    <div className="mt-8">
      <p className="text-sm font-medium">¿No te llega el correo? Escribe al soporte</p>
      {/* Las filas, hundidas en el papel como los trozos de la app de la portada. */}
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl bg-wall ring-1 ring-border">
        {settings.isPending ? (
          <div className="flex min-h-12 items-center px-4">
            <Skeleton className="h-5 w-48" />
          </div>
        ) : (
          <a href={`mailto:${supportEmail}`} className={CONTACT_ROW}>
            <Mail className="text-muted-foreground" aria-hidden /> <span className="min-w-0 truncate">{supportEmail}</span>
          </a>
        )}
        {whatsAppUrl && (
          <a href={whatsAppUrl} target="_blank" rel="noreferrer" className={CONTACT_ROW}>
            <WhatsAppIcon /> {supportPhone}
          </a>
        )}
      </div>
    </div>
  );
}
