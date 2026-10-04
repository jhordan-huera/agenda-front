import { Link } from "react-router";
import { useNavigate } from "react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getHomePath } from "@/lib/auth";
import { getErrorMessage } from "@/lib/data/errors";
import { loginSchema } from "@/lib/validations/auth";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import { useSession } from "./use-session";


export function LoginForm() {
  const navigate = useNavigate();
  const { signIn } = useSession();
  const [values, setValues] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(loginSchema, values);
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;

    setPending(true);
    try {
      const session = await signIn(result.data);
      toast.success("¡Bienvenido de nuevo!");
      navigate(getHomePath(session), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(false);
    }
  };

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
