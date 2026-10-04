import { useNavigate } from "react-router";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/data/errors";
import { registerSchema } from "@/lib/validations/auth";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import { useSession } from "./use-session";

const INITIAL_VALUES = { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" };

export function RegisterForm() {
  const navigate = useNavigate();
  const { signUp } = useSession();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = (key: keyof typeof INITIAL_VALUES) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [key]: event.target.value });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(registerSchema, values);
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;

    setPending(true);
    try {
      await signUp(result.data);
      toast.success("Cuenta creada. Configuremos tu negocio.");
      navigate("/onboarding", { replace: true });
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
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Nombre" error={errors.firstName}>
          {(field) => (
            <Input {...field} autoComplete="given-name" className="h-10" value={values.firstName} onChange={update("firstName")} />
          )}
        </FormField>
        <FormField label="Apellido" error={errors.lastName}>
          {(field) => (
            <Input {...field} autoComplete="family-name" className="h-10" value={values.lastName} onChange={update("lastName")} />
          )}
        </FormField>
      </div>
      <FormField label="Email" error={errors.email}>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            className="h-10"
            value={values.email}
            onChange={update("email")}
          />
        )}
      </FormField>
      <FormField label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres.">
        {(field) => (
          <PasswordInput {...field} autoComplete="new-password" value={values.password} onChange={update("password")} />
        )}
      </FormField>
      <FormField label="Confirmar contraseña" error={errors.confirmPassword}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={update("confirmPassword")}
          />
        )}
      </FormField>
      <SubmitButton size="lg" className="h-10" loading={pending} loadingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">
        Al crear tu cuenta aceptas los términos del servicio y la política de privacidad.
      </p>
    </form>
  );
}
