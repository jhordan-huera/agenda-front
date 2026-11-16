import { CircleAlert, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FORM_ALERT } from "@/features/auth/auth-styles";
import { CAPTCHA_BOX_CLASS, useCaptcha } from "@/features/booking/use-captcha";
import { usePatientConfig } from "@/hooks/queries/use-patient-account";
import { data, DataError, getErrorMessage } from "@/lib/data";
import { patientSignupSchema } from "@/lib/validations/loyalty";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { PatientAccount } from "@/types";

/**
 * «Crear mi cuenta» de la tarjeta: su nombre, su teléfono y una contraseña, con el CAPTCHA de la página de reservas
 * (casi nunca se ve). La cuenta no ve nada de ningún consultorio hasta que uno escanea su QR en una cita.
 */
export function PatientSignupForm({
  phone,
  onPhoneChange,
  onSignedIn,
  onGoToLogin,
}: {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onSignedIn: (account: PatientAccount) => void;
  /** «Ya hay una cuenta con este teléfono»: a «Entrar», con el teléfono escrito. */
  onGoToLogin: () => void;
}) {
  const config = usePatientConfig();
  const { containerRef: captchaRef, getToken: getCaptchaToken } = useCaptcha(config.data?.captchaSiteKey ?? null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ message: string; taken: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(patientSignupSchema, { name, phone, password });
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;
    setPending(true);
    try {
      // El token va junto a los datos: la API lo comprueba antes de crear la cuenta.
      const { name: cleanName, phone: cleanPhone, password: cleanPassword } = result.data;
      onSignedIn(await data.patient.signup({ name: cleanName, phone: cleanPhone, password: cleanPassword, captchaToken: await getCaptchaToken() }));
    } catch (error) {
      setFormError({ message: getErrorMessage(error), taken: error instanceof DataError && error.code === "conflict" });
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      {formError && (
        <div role="alert" className={FORM_ALERT}>
          <CircleAlert aria-hidden />
          <div>
            <p>{formError.message}</p>
            {formError.taken && (
              <Button type="button" variant="link" className="h-auto p-0 font-semibold" onClick={onGoToLogin}>
                Entrar con este teléfono
              </Button>
            )}
          </div>
        </div>
      )}
      <FormField label="Tu nombre" error={errors.name}>
        {(field) => <Input {...field} autoComplete="name" className="h-11" value={name} onChange={(event) => setName(event.target.value)} />}
      </FormField>
      <FormField label="Teléfono" error={errors.phone} hint="Con él entras a tu cuenta.">
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
      <FormField label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres.">
        {(field) => (
          <PasswordInput
            {...field}
            className="h-11"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </FormField>
      <div>
        {/* Sólo ocupa espacio si Cloudflare pide marcar la casilla. */}
        <div ref={captchaRef} className={CAPTCHA_BOX_CLASS} />
        <SubmitButton size="lg" className="h-11 w-full text-base" loading={pending} disabled={config.isPending} loadingText="Creando tu cuenta…">
          Crear mi cuenta
        </SubmitButton>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Al crear tu cuenta aceptas la{" "}
        <a
          href="/privacidad"
          target="_blank"
          rel="noreferrer"
          className="rounded-sm underline decoration-rule-strong underline-offset-4 outline-none hover:text-foreground hover:decoration-current focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          política de privacidad
        </a>
        .
      </p>
    </form>
  );
}
