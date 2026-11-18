import { toast } from "sonner";
import { SettingsSection } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useSetLoyaltyAllowed } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import type { Business } from "@/types";

/**
 * La tarjeta de fidelización en este negocio (spec 052, pedido del dueño 2026-11-18). Sólo el super admin la habilita;
 * queda en la actividad del negocio. Al quitarla se apaga todo y se guarda lo ganado (ver adminService.setLoyaltyAllowed).
 */
export function LoyaltyAllowedCard({ business }: { business: Business }) {
  const { values, setField, dirty, reset } = useSettingsForm({ enabled: business.loyaltyAllowed ?? false });
  const save = useSetLoyaltyAllowed();

  const submit = async () => {
    try {
      const saved = await save.mutateAsync({ businessId: business.id, enabled: values.enabled });
      reset({ enabled: saved.loyaltyAllowed });
      toast.success(saved.loyaltyAllowed ? "Tarjeta de fidelización habilitada" : "Tarjeta de fidelización quitada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Tarjeta de fidelización"
      description="Sólo para los negocios que la pidan. El negocio no puede cambiarlo desde su configuración."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Habilitar la tarjeta de fidelización"
        description="Aparecen «Fidelización», «Escanear» y «QR para tus pacientes»; el propietario la configura y la enciende. Si la quitas, se apaga: deja de sumar sellos y sus pacientes dejan de verla. Los sellos y los premios se guardan, y lo ya ganado se puede canjear desde la ficha."
        checked={values.enabled}
        onCheckedChange={(checked) => setField("enabled", checked)}
      />
    </SettingsSection>
  );
}
