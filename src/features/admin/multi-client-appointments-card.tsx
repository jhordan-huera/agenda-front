import { toast } from "sonner";
import { SettingsSection } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useSetMultiClientAppointments } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import type { Business } from "@/types";

/**
 * Citas con varios pacientes (sesiones de pareja) en este negocio. Sólo el super admin lo cambia; queda
 * en la actividad del negocio. Al apagarlo, las citas que ya tienen varios pacientes los conservan.
 */
export function MultiClientAppointmentsCard({ business }: { business: Business }) {
  const { values, setField, dirty, reset } = useSettingsForm({ enabled: business.multiClientAppointments ?? false });
  const save = useSetMultiClientAppointments();

  const submit = async () => {
    try {
      const saved = await save.mutateAsync({ businessId: business.id, enabled: values.enabled });
      reset({ enabled: saved.multiClientAppointments });
      toast.success(saved.multiClientAppointments ? "Citas con varios pacientes activadas" : "Citas con varios pacientes desactivadas");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Citas con varios pacientes"
      description="Para sesiones de pareja o de familia. El negocio no puede cambiarlo desde su configuración."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <SwitchField
        label="Permitir varios pacientes en una cita"
        description="Hasta 3 pacientes por cita. Cada uno recibe sus avisos y la cita aparece en la ficha de todos. Si lo apagas, las citas que ya los tienen los conservan."
        checked={values.enabled}
        onCheckedChange={(checked) => setField("enabled", checked)}
      />
    </SettingsSection>
  );
}
