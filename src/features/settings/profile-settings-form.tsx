import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PasswordInput } from "@/components/shared/password-input";
import { Input } from "@/components/ui/input";
import { useUpdateProfile } from "@/hooks/queries/use-account";
import { getErrorMessage } from "@/lib/data";
import { getInitials } from "@/lib/format";
import { currentPasswordSchema } from "@/lib/validations/auth";
import { profileSchema, type ProfileInput } from "@/lib/validations/business";
import { validate } from "@/lib/validations/validate";
import type { User } from "@/types";
import { ImageUploadField } from "./image-upload-field";
import { SettingsSection } from "./settings-section";
import { useSettingsForm } from "./use-settings-form";

export function ProfileSettingsForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const saved: ProfileInput = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(saved);
  const [uploading, setUploading] = useState(false);
  // Cambiar el email con el que se inicia sesión pide la contraseña actual (con sólo la sesión abierta no basta).
  const [currentPassword, setCurrentPassword] = useState("");
  const emailChanged = values.email.trim().toLowerCase() !== user.email;

  const submit = async () => {
    const result = validate(profileSchema, values);
    const password = emailChanged ? validate(currentPasswordSchema, { currentPassword }) : null;
    setErrors({ ...result.errors, ...password?.errors });
    if (!result.success || (password && !password.success)) return;
    try {
      await updateProfile.mutateAsync(emailChanged ? { ...result.data, currentPassword } : result.data);
      reset(result.data);
      setCurrentPassword("");
      toast.success(emailChanged ? "Perfil actualizado: desde ahora inicias sesión con tu email nuevo" : "Perfil actualizado");
    } catch (error) {
      const message = getErrorMessage(error);
      if (emailChanged && /contraseña/i.test(message)) setErrors({ currentPassword: message });
      else toast.error(message);
    }
  };

  return (
    <SettingsSection
      title="Perfil"
      description="Tus datos personales. Tu nombre y foto aparecen en tu página de reservas."
      dirty={dirty}
      saving={updateProfile.isPending}
      uploading={uploading}
      onSubmit={submit}
      onDiscard={() => {
        reset();
        setCurrentPassword("");
      }}
    >
      <ImageUploadField
        target="avatar"
        label="Foto"
        value={values.avatarUrl}
        onChange={(avatarUrl) => setField("avatarUrl", avatarUrl)}
        onUploadingChange={setUploading}
        fallback={getInitials(`${values.firstName} ${values.lastName}`)}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Nombre" error={errors.firstName}>
          {(field) => (
            <Input {...field} autoComplete="given-name" value={values.firstName} onChange={(e) => setField("firstName", e.target.value)} />
          )}
        </FormField>
        <FormField label="Apellido" error={errors.lastName}>
          {(field) => (
            <Input {...field} autoComplete="family-name" value={values.lastName} onChange={(e) => setField("lastName", e.target.value)} />
          )}
        </FormField>
        <FormField label="Email" error={errors.email} hint="Lo usas para iniciar sesión.">
          {(field) => (
            <Input {...field} type="email" autoComplete="email" value={values.email} onChange={(e) => setField("email", e.target.value)} />
          )}
        </FormField>
        <FormField label="Teléfono" error={errors.phone} optional>
          {(field) => (
            <Input {...field} type="tel" autoComplete="tel" value={values.phone} onChange={(e) => setField("phone", e.target.value)} />
          )}
        </FormField>
        {emailChanged && (
          <FormField
            label="Tu contraseña actual"
            error={errors.currentPassword}
            hint="Para cambiar el email con el que inicias sesión, confirma que eres tú."
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.currentPassword;
                    return next;
                  });
                }}
              />
            )}
          </FormField>
        )}
      </div>
    </SettingsSection>
  );
}
