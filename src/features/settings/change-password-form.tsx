import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { authService } from "@/lib/auth";
import { getErrorMessage } from "@/lib/data";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { validate } from "@/lib/validations/validate";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

const EMPTY: ChangePasswordInput = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Cambio de la propia contraseña del super admin (las de los usuarios las pone él desde /admin). */
export function ChangePasswordForm() {
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(EMPTY);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const result = validate(changePasswordSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    setSaving(true);
    try {
      await authService.changePassword(result.data);
      reset(EMPTY);
      toast.success("Contraseña actualizada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="Contraseña"
      description="La contraseña de tu cuenta de super admin."
      dirty={dirty}
      saving={saving}
      onSubmit={submit}
      onDiscard={() => reset(EMPTY)}
    >
      <FormField label="Contraseña actual" error={errors.currentPassword}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={(e) => setField("currentPassword", e.target.value)}
          />
        )}
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Nueva contraseña" error={errors.newPassword} hint="Mínimo 8 caracteres.">
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              value={values.newPassword}
              onChange={(e) => setField("newPassword", e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Confirmar contraseña" error={errors.confirmPassword}>
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
            />
          )}
        </FormField>
      </div>
    </SettingsSection>
  );
}
