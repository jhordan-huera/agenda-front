import { CircleAlert, LinkIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { PageTitle } from "@/components/shared/page-title";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FORM_ALERT } from "@/features/auth/auth-styles";
import { PatientShell } from "@/features/patient/patient-shell";
import { usePatientResetInfo, usePatientSession } from "@/hooks/queries/use-patient-account";
import { PATIENT_RESET_HOURS } from "@/lib/constants/loyalty";
import { data, getErrorMessage } from "@/lib/data";
import { patientResetSchema } from "@/lib/validations/loyalty";
import { validate } from "@/lib/validations/validate";

/**
 * /mi-tarjeta/clave/:token (spec 052, Historia 6): el enlace que el consultorio le manda por WhatsApp al paciente que
 * olvidó su contraseña. Sirve una vez y por 24 horas; al guardar, entra a su cuenta y va a «Mi tarjeta».
 */
export default function PatientResetPage() {
  const { token = "" } = useParams<{ token: string }>();
  const info = usePatientResetInfo(token);

  return (
    <PatientShell business={null}>
      <PageTitle title="Tu contraseña nueva" />
      {info.isPending ? (
        <div role="status" aria-label="Cargando" className="space-y-4 pb-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : info.isError ? (
        <ErrorState
          className="mb-8"
          description={getErrorMessage(info.error, "Revisa tu conexión e inténtalo de nuevo.")}
          onRetry={() => info.refetch()}
        />
      ) : !info.data.valid ? (
        <EmptyState
          icon={LinkIcon}
          className="mb-8"
          title="Este enlace ya se usó o venció"
          description="Pide otro en tu consultorio."
          action={
            <Button asChild variant="outline">
              <Link to="/mi-tarjeta">Ir a mi tarjeta</Link>
            </Button>
          }
        />
      ) : (
        <ResetForm token={token} firstName={info.data.firstName} />
      )}
    </PatientShell>
  );
}

function ResetForm({ token, firstName }: { token: string; firstName: string | null }) {
  const navigate = useNavigate();
  const { setAccount } = usePatientSession();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(patientResetSchema, { password });
    setFieldError(result.errors.password);
    setFormError(null);
    if (!result.success) return;
    setPending(true);
    try {
      setAccount(await data.patient.resetPassword(token, result.data.password));
      toast.success("Listo, tu contraseña nueva ya está guardada.");
      navigate("/mi-tarjeta", { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] break-words">
          {firstName ? `Hola, ${firstName}: crea tu contraseña nueva` : "Crea tu contraseña nueva"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Tu consultorio te envió este enlace para tu tarjeta de fidelización. Sirve una sola vez y vence a las{" "}
          {PATIENT_RESET_HOURS} horas.
        </p>
      </div>
      <form onSubmit={submit} noValidate className="grid gap-5 rounded-2xl border bg-card p-4 sm:p-5">
        {formError && (
          <p role="alert" className={FORM_ALERT}>
            <CircleAlert aria-hidden />
            {formError}
          </p>
        )}
        <FormField label="Contraseña nueva" error={fieldError} hint="Mínimo 4 caracteres: puede ser un PIN de 4 números.">
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
        <SubmitButton size="lg" className="h-11 w-full text-base" loading={pending} loadingText="Guardando…">
          Guardar y entrar
        </SubmitButton>
      </form>
    </div>
  );
}
