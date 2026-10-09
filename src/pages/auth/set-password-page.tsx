import { ArrowLeft, LinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageTitle } from "@/components/shared/page-title";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthCardHeader } from "@/features/auth/auth-card-header";
import { useSession } from "@/features/auth/use-session";
import { authService } from "@/lib/auth";
import { DataError, getErrorMessage } from "@/lib/data/errors";
import { setPasswordSchema } from "@/lib/validations/auth";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/validations/fields";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { PasswordLinkInfo } from "@/types";

/**
 * /definir-contrasena?token=…: la persona define su contraseña con el enlace de un solo uso que le
 * llegó por email (cuenta nueva o contraseña olvidada). Sin sesión: el token es la autorización.
 */
export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const link = useQuery({
    queryKey: ["password-link", token],
    queryFn: () => authService.checkPasswordLink(token),
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
  });

  return (
    <>
      <PageTitle title="Define tu contraseña" />
      {!token || link.isError ? (
        // Caducado o ya usado: el texto de la página lo explica. Otros motivos (cuenta desactivada, demasiados
        // intentos), con el mensaje de la API.
        <InvalidLink
          message={
            link.error instanceof DataError && !["not_found", "network"].includes(link.error.code) ? link.error.message : null
          }
        />
      ) : link.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <SetPasswordForm token={token} info={link.data} />
      )}
    </>
  );
}

function SetPasswordForm({ token, info }: { token: string; info: PasswordLinkInfo }) {
  const navigate = useNavigate();
  const { refresh } = useSession();
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(setPasswordSchema, { token, ...values });
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;
    setPending(true);
    try {
      await authService.setPasswordWithLink(result.data);
      // Las sesiones de la cuenta se cerraron: si este navegador tenía una, ya no vale.
      await refresh();
      toast.success("Contraseña guardada", { description: "Inicia sesión con tu email y la contraseña nueva." });
      navigate("/login", { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <>
      <AuthCardHeader
        title="Define tu contraseña"
        description={
          <>
            Hola {info.firstName}: elige la contraseña de <strong className="break-words text-foreground">{info.email}</strong>.
            Sólo tú la conocerás.
          </>
        }
      />
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        {/* Para el gestor de contraseñas del navegador: guarda la nueva con este email. */}
        <input type="email" name="email" autoComplete="username" value={info.email} readOnly hidden />
        <FormField label="Contraseña nueva" error={errors.password} hint={`Mínimo ${NEW_PASSWORD_MIN_LENGTH} caracteres.`}>
          {(field) => (
            <PasswordInput
              {...field}
              autoFocus
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Repite la contraseña" error={errors.confirmPassword}>
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
            />
          )}
        </FormField>
        {formError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}
        <SubmitButton className="w-full" size="lg" loading={pending} loadingText="Guardando…">
          Guardar contraseña
        </SubmitButton>
        <p className="text-center text-xs text-muted-foreground">
          El enlace sirve una sola vez. Al guardarla se cierran las sesiones abiertas de tu cuenta.
        </p>
      </form>
    </>
  );
}

function InvalidLink({ message }: { message: string | null }) {
  return (
    <>
      <AuthCardHeader
        title="Este enlace ya no sirve"
        description={message ?? "El enlace caducó (dura 60 minutos), ya se usó o se pidió otro más nuevo."}
      />
      <div className="rounded-xl border bg-muted/40 p-6 text-center">
        <LinkIcon className="mx-auto size-10 text-primary" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">
          Pide al soporte que te envíe un enlace nuevo. Si ya definiste tu contraseña, inicia sesión con ella.
        </p>
        <div className="mt-4 grid gap-2">
          <Button asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/forgot-password">Contactar al soporte</Link>
          </Button>
        </div>
      </div>
      <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver al inicio
      </Link>
    </>
  );
}
