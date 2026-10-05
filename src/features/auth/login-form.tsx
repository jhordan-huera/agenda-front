import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHomePath, isTwoFactorChallenge, type Session } from "@/lib/auth";
import { DataError, getErrorMessage } from "@/lib/data/errors";
import { loginSchema, twoFactorLoginSchema } from "@/lib/validations/auth";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import { useSession } from "./use-session";


export function LoginForm() {
  const navigate = useNavigate();
  const { signIn } = useSession();
  const [values, setValues] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Con la verificación en dos pasos: la contraseña es correcta y falta el código. */
  const [challenge, setChallenge] = useState<string | null>(null);

  const enter = (session: Session) => {
    toast.success("¡Bienvenido de nuevo!");
    navigate(getHomePath(session), { replace: true });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(loginSchema, values);
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
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}
      <FormField label="Email" error={errors.email}>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            className="h-10"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Contraseña" error={errors.password}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="current-password"
            placeholder="••••••••"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
        )}
      </FormField>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={values.remember}
            onCheckedChange={(checked) => setValues({ ...values, remember: checked === true })}
          />
          <Label htmlFor="remember" className="font-normal">
            Recordarme
          </Label>
        </div>
        <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      <SubmitButton size="lg" className="h-10" loading={pending} loadingText="Ingresando…">
        Iniciar sesión
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
    const result = validate(twoFactorLoginSchema, { challenge, code });
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
      <div className="flex gap-3 rounded-lg bg-primary/5 px-3 py-3 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
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
              className="h-10 font-mono uppercase"
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
              className="h-10 font-mono text-lg tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
            />
          )
        }
      </FormField>
      <SubmitButton size="lg" className="h-10" loading={pending} loadingText="Verificando…">
        Verificar
      </SubmitButton>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Button type="button" variant="ghost" size="sm" onClick={() => onRestart(null)} disabled={pending}>
          <ArrowLeft /> Volver
        </Button>
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode("");
            setError(null);
          }}
        >
          {useRecovery ? "Usar el código de la app" : "¿No tienes el celular? Usa un código de recuperación"}
        </button>
      </div>
    </form>
  );
}
