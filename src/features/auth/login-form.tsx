import { ArrowLeft, ArrowRight, CircleAlert, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHomePath, isTwoFactorChallenge, safeNextPath, type Session } from "@/lib/auth";
import { DataError, getErrorMessage } from "@/lib/data/errors";
import { cn } from "@/lib/utils";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import { loadAuthSchemas } from "./auth-schemas";
import { AUTH_LINK, FORM_ALERT } from "./auth-styles";
import { useSession } from "./use-session";

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useSession();
  const [values, setValues] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Con la verificación en dos pasos: la contraseña es correcta y falta el código. */
  const [challenge, setChallenge] = useState<string | null>(null);

  useEffect(() => {
    loadAuthSchemas().catch(() => undefined);
  }, []);

  // Con `?next=` (la pantalla de un aviso, spec 013) vuelve allí si es de su panel; si no, al Inicio. También tras la verificación en dos pasos.
  const enter = (session: Session) => {
    toast.success("¡Bienvenido de nuevo!");
    navigate(safeNextPath(searchParams.get("next"), session) ?? getHomePath(session), { replace: true });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    let schemas;
    try {
      schemas = await loadAuthSchemas();
    } catch (error) {
      setFormError(getErrorMessage(error));
      return;
    }
    const result = validate(schemas.loginSchema, values);
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;

    setPending(true);
    try {
      const outcome = await signIn(result.data);
      if (isTwoFactorChallenge(outcome)) {
        setChallenge(outcome.challenge);
        setPending(false);
        return;
      }
      enter(outcome);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(false);
    }
  };

  if (challenge) {
    return (
      <TwoFactorStep
        challenge={challenge}
        onSuccess={enter}
        onRestart={(message) => {
          setChallenge(null);
          setValues((current) => ({ ...current, password: "" }));
          setFormError(message);
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {formError && (
        <p role="alert" className={FORM_ALERT}>
          <CircleAlert aria-hidden />
          {formError}
        </p>
      )}
      <FormField label="Email" error={errors.email}>
        {(field) => (
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              {...field}
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="h-11 pl-10"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </div>
        )}
      </FormField>
      <FormField label="Contraseña" error={errors.password}>
        {(field) => (
          <PasswordInput
            {...field}
            icon={<LockKeyhole />}
            className="h-11"
            autoComplete="current-password"
            placeholder="••••••••"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
        )}
      </FormField>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={values.remember}
            onCheckedChange={(checked) => setValues({ ...values, remember: checked === true })}
          />
          {/* La etiqueta también marca la casilla: con 44 px de alto se toca bien con el dedo. */}
          <Label htmlFor="remember" className="min-h-11 font-normal">
            Recordarme
          </Label>
        </div>
        <Link to="/forgot-password" className={cn(AUTH_LINK, "text-sm font-medium")}>
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton size="lg" className="h-11 w-full text-base" loading={pending} loadingText="Ingresando…">
        Iniciar sesión <ArrowRight className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
      </SubmitButton>
    </form>
  );
}

interface TwoFactorStepProps {
  challenge: string;
  onSuccess: (session: Session) => void;
  /** Hay que volver a la contraseña (caducó, demasiados códigos incorrectos…) con este aviso, o null. */
  onRestart: (message: string | null) => void;
}

/** Segundo paso: el código de 6 dígitos de la app de autenticación o un código de recuperación. */
function TwoFactorStep({ challenge, onSuccess, onRestart }: TwoFactorStepProps) {
  const { verifyTwoFactor } = useSession();
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    let schemas;
    try {
      schemas = await loadAuthSchemas();
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      return;
    }
    const result = validate(schemas.twoFactorLoginSchema, { challenge, code });
    setError(result.errors.code ?? null);
    if (!result.success) return;
    setPending(true);
    try {
      onSuccess(await verifyTwoFactor(result.data));
    } catch (verifyError) {
      setPending(false);
      // Código incorrecto: se queda aquí. Caducó, demasiados intentos o cuenta bloqueada: a la contraseña.
      if (verifyError instanceof DataError && verifyError.code === "validation") setError(verifyError.message);
      else onRestart(getErrorMessage(verifyError));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <div className="flex gap-3 rounded-xl bg-wall px-4 py-3.5 text-sm ring-1 ring-border">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Verificación en dos pasos</p>
          <p className="text-muted-foreground">
            {useRecovery
              ? "Escribe uno de tus códigos de recuperación. Cada código sirve una sola vez."
              : "Abre tu app de autenticación (Google Authenticator, Microsoft Authenticator…) y escribe el código de 6 dígitos de Agenda360."}
          </p>
        </div>
      </div>
      <FormField label={useRecovery ? "Código de recuperación" : "Código de verificación"} error={error ?? undefined}>
        {(field) =>
          useRecovery ? (
            <Input
              {...field}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              placeholder="ABCDE-FGHJK"
              className="h-11 font-mono uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          ) : (
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={7}
              placeholder="123456"
              className="h-11 font-mono text-lg tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
            />
          )
        }
      </FormField>
      <SubmitButton size="lg" className="h-11 w-full text-base" loading={pending} loadingText="Verificando…">
        Verificar
      </SubmitButton>
      {/* La otra forma de entrar y, debajo, volver a la contraseña: en columna, alineadas con los campos. */}
      <div className="flex flex-col items-start text-sm">
        <button
          type="button"
          className={cn(AUTH_LINK, "inline-flex min-h-11 items-center text-left font-medium")}
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode("");
            setError(null);
          }}
        >
          {useRecovery ? "Usar el código de la app" : "¿No tienes el celular? Usa un código de recuperación"}
        </button>
        <Button
          type="button"
          variant="link"
          className="h-11 px-0 text-muted-foreground hover:text-foreground"
          onClick={() => onRestart(null)}
          disabled={pending}
        >
          <ArrowLeft aria-hidden /> Volver a la contraseña
        </Button>
      </div>
    </form>
  );
}
