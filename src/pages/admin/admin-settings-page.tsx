import { BellRing, KeyRound, Settings2, ShieldCheck, SunMoon } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { Input } from "@/components/ui/input";
import { BillingAccountsCard } from "@/features/admin/billing-accounts-card";
import { PanelColorsCard } from "@/features/admin/panel-colors-card";
import { PlatformTeamCard } from "@/features/admin/platform-team-card";
import { PushSettingsCard } from "@/features/push/push-settings-card";
import { ChangePasswordForm } from "@/features/settings/change-password-form";
import { SettingsSection, SettingsSectionSkeleton } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { ThemeModeCard } from "@/features/settings/theme-mode-card";
import { TwoFactorSettings } from "@/features/settings/two-factor-settings";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { usePlatformSettings, useUpdatePlatformSettings } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { platformSettingsSchema } from "@/lib/validations/admin";
import { validate } from "@/lib/validations/validate";
import type { PlatformSettings } from "@/types";

export default function AdminSettingsPage() {
  const settings = usePlatformSettings();

  return (
    <div className="space-y-6">
      <PageTitle title="Configuración de la plataforma" />
      <PageHeader title="Configuración" description="Ajustes globales de la plataforma y de tu cuenta." />

      {/* Dos columnas en pantallas anchas: la plataforma a la izquierda y tu cuenta a la derecha. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="grid min-w-0 gap-6">
          {settings.isPending ? (
            <SettingsSectionSkeleton fields={3} />
          ) : settings.isError ? (
            <ErrorState onRetry={() => settings.refetch()} />
          ) : (
            <PlatformSettingsForm settings={settings.data} />
          )}
          {/* Las cuentas de las mensualidades (spec 029): aparte de la configuración pública. */}
          <BillingAccountsCard />
          <PlatformTeamCard />
        </div>
        <div className="grid min-w-0 gap-6">
          <PanelColorsCard />
          <ThemeModeCard icon={SunMoon} />
          <TwoFactorSettings icon={ShieldCheck} />
          <PushSettingsCard audience="platform" icon={BellRing} />
          <ChangePasswordForm icon={KeyRound} />
        </div>
      </div>
    </div>
  );
}

function PlatformSettingsForm({ settings }: { settings: PlatformSettings }) {
  const update = useUpdatePlatformSettings();
  const { values, setField, errors, setErrors, dirty, reset } = useSettingsForm(settings);

  const submit = async () => {
    const result = validate(platformSettingsSchema, values);
    setErrors(result.errors);
    if (!result.success) return;
    try {
      reset(await update.mutateAsync(result.data));
      toast.success("Configuración guardada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Altas de negocios y soporte"
      icon={Settings2}
      description="Decide quién puede crear negocios en la plataforma y cómo te contactan."
      dirty={dirty}
      saving={update.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Registro público abierto"
        description={
          values.allowPublicSignup
            ? "Cualquier profesional puede crear su cuenta en /register y configurar su negocio. Tú también puedes crearlos desde Negocios."
            : "El registro está cerrado: sólo tú creas negocios y propietarios desde Negocios → Nuevo negocio."
        }
        checked={values.allowPublicSignup}
        onCheckedChange={(checked) => setField("allowPublicSignup", checked)}
      />
      <FormField
        label="Email de soporte"
        error={errors.supportEmail}
        hint="Se muestra a negocios suspendidos, cuentas desactivadas y en el registro cerrado."
      >
        {(field) => (
          <Input {...field} type="email" value={values.supportEmail} onChange={(e) => setField("supportEmail", e.target.value)} />
        )}
      </FormField>
      <FormField
        label="Teléfono de soporte (WhatsApp)"
        optional
        error={errors.supportPhone}
        hint="Se muestra junto al email con un enlace para escribirte por WhatsApp."
      >
        {(field) => (
          <Input
            {...field}
            type="tel"
            inputMode="tel"
            placeholder="099 406 0669"
            value={values.supportPhone}
            onChange={(e) => setField("supportPhone", e.target.value)}
          />
        )}
      </FormField>
    </SettingsSection>
  );
}
