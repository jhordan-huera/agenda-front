import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { useUpdateProfile } from "@/hooks/queries/use-account";
import { getErrorMessage } from "@/lib/data";
import { getInitials } from "@/lib/format";
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

  const submit = async () => {
    const result = validate(profileSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await updateProfile.mutateAsync(result.data);
      reset(result.data);
      toast.success("Perfil actualizado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Perfil"
      description="Tus datos personales. Tu nombre y foto aparecen en tu página de reservas."
      dirty={dirty}
      saving={updateProfile.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <ImageUploadField
        label="Foto"
        value={values.avatarUrl}
        onChange={(avatarUrl) => setField("avatarUrl", avatarUrl)}
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
      </div>
    </SettingsSection>
  );
}
