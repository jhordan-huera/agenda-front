import { CircleAlert, LockKeyhole, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { FORM_ALERT } from "@/features/auth/auth-styles";
import { data, getErrorMessage } from "@/lib/data";
import { patientLoginSchema } from "@/lib/validations/loyalty";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { PatientAccount } from "@/types";

/** «Entrar» a la cuenta de la tarjeta: con el teléfono y la contraseña que eligió el paciente. */
export function PatientLoginForm({
  phone,
  onPhoneChange,
  onSignedIn,
}: {
  /** El teléfono va arriba (en la página): pasa de «Entrar» a «Crear mi cuenta» sin escribirlo otra vez. */
  phone: string;
  onPhoneChange: (phone: string) => void;
  onSignedIn: (account: PatientAccount) => void;
}) {
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(patientLoginSchema, { phone, password });
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;
    setPending(true);
    try {
      onSignedIn(await data.patient.login({ phone: result.data.phone, password: result.data.password }));
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError && (
        <p role="alert" className={FORM_ALERT}>
          <CircleAlert aria-hidden />
          {formError}
        </p>
      )}
      <FormField label="Teléfono" error={errors.phone}>
        {(field) => (
          <div className="relative">
            <Phone aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...field}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0991234567"
              className="h-11 pl-10"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </FormField>
      <SubmitButton size="lg" className="h-11 w-full text-base" loading={pending} loadingText="Entrando…">
        Entrar
      </SubmitButton>
      <p className="text-sm text-muted-foreground">
        ¿Olvidaste tu contraseña? Pídele a tu consultorio un enlace para crear otra.
      </p>
    </form>
  );
}
