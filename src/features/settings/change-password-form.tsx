import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { authService } from "@/lib/auth";
import { getErrorMessage } from "@/lib/data";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { NEW_PASSWORD_MIN_LENGTH } from "@/lib/validations/fields";
import { validate } from "@/lib/validations/validate";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

const EMPTY: ChangePasswordInput = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Cambio de la propia contraseña (cualquier usuario): pide la actual y cierra las demás sesiones abiertas
 * (otros navegadores o celulares). Si la olvidó, el soporte le envía un enlace para definir otra.
 */
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
      toast.success("Contraseña actualizada", { description: "Cerramos tus sesiones en otros dispositivos." });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSection
      title="Contraseña"
      description="Con la que inicias sesión. Al cambiarla se cierran tus sesiones abiertas en otros dispositivos."
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
        <FormField label="Nueva contraseña" error={errors.newPassword} hint={`Mínimo ${NEW_PASSWORD_MIN_LENGTH} caracteres.`}>
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
