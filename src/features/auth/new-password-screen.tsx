import { CircleAlert, KeyRound, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSignOut } from "@/components/layout/use-sign-out";
import { FormField } from "@/components/shared/form-field";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { PasswordInput } from "@/components/shared/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth";
import { getErrorMessage } from "@/lib/data";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validations/auth";
import { validate } from "@/lib/validations/validate";
import { FORM_ALERT } from "./auth-styles";
import { useSession } from "./use-session";

/**
 * «Crea tu contraseña nueva» (spec 054): lo ve quien entró con una contraseña temporal (la del email de «¿Olvidaste tu
 * contraseña?» o la que puso el soporte), en lugar del panel o de /admin. La API rechaza todo lo demás
 * (`password_change_required`) hasta que la cree. Al guardarla, la sesión se vuelve a leer y aparece el panel.
 */
export function NewPasswordScreen() {
  const { refresh } = useSession();
  const signOut = useSignOut();
  const [values, setValues] = useState<NewPasswordInput>({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof NewPasswordInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof NewPasswordInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(newPasswordSchema, values);
    setErrors(result.errors);
    setFormError(null);
    if (!result.success) return;
    setSaving(true);
    try {
      await authService.newPassword(result.data);
      toast.success("Listo, ya tienes tu contraseña nueva.");
      await refresh();
    } catch (error) {
      setFormError(getErrorMessage(error));
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-10">
      <PageTitle title="Crea tu contraseña nueva" />
      <Logo />
      <form onSubmit={submit} noValidate className="grid w-full max-w-md gap-5 rounded-2xl border bg-background p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span aria-hidden className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <KeyRound className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Crea tu contraseña nueva</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entraste con una contraseña temporal. Elige la tuya para seguir: desde ahora entras con ella.
          </p>
        </div>
        {formError && (
          <div role="alert" className={FORM_ALERT}>
            <CircleAlert aria-hidden />
            <p>{formError}</p>
          </div>
        )}
        <FormField label="Contraseña nueva" error={errors.newPassword} hint="Mínimo 8 caracteres, distinta de la temporal.">
          {(field) => (
            <PasswordInput
              {...field}
              autoFocus
              autoComplete="new-password"
              className="h-11"
              value={values.newPassword}
              onChange={(event) => setField("newPassword", event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Confirmar contraseña" error={errors.confirmPassword}>
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              className="h-11"
              value={values.confirmPassword}
              onChange={(event) => setField("confirmPassword", event.target.value)}
            />
          )}
        </FormField>
        <SubmitButton size="lg" className="h-11 w-full text-base" loading={saving} loadingText="Guardando…">
          Guardar y entrar
        </SubmitButton>
        <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
