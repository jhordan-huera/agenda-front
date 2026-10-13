import { toast } from "sonner";
import { SettingsSection } from "@/features/settings/settings-section";
import { SwitchField } from "@/features/settings/switch-field";
import { useSettingsForm } from "@/features/settings/use-settings-form";
import { useSetClientRequiredFields } from "@/hooks/queries/use-admin";
import { CLIENT_REQUIRED_FIELD_OPTIONS, clientRequiredFieldsOf } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import type { Business, ClientRequiredFields } from "@/types";

const DESCRIPTIONS: Record<keyof ClientRequiredFields, string> = {
  documentId: "Identifica al paciente: con ella, sus reservas online se unen a su ficha.",
  email: "Por donde le llegan las confirmaciones y los recordatorios de sus citas.",
  phone: "Para escribirle por WhatsApp.",
  address: "Su domicilio (por ejemplo, para las visitas a domicilio).",
};

/**
 * Qué datos del paciente pide el panel de este negocio al crearlo o editarlo. Sólo el super admin lo
 * cambia; queda en la actividad del negocio.
 */
export function ClientRequiredFieldsCard({ business }: { business: Business }) {
  const { values, setField, dirty, reset } = useSettingsForm(clientRequiredFieldsOf(business));
  const save = useSetClientRequiredFields();

  const submit = async () => {
    try {
      const saved = await save.mutateAsync({ businessId: business.id, fields: values });
      reset(clientRequiredFieldsOf(saved));
      toast.success("Datos obligatorios del paciente guardados");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection
      title="Datos obligatorios del paciente"
      description="Se aplica al crear o editar pacientes desde el panel de este negocio. La reserva online siempre pide cédula, nombre, email y teléfono."
      dirty={dirty}
      saving={save.isPending}
      onSubmit={submit}
      onDiscard={() => reset()}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SwitchField label="Nombre" description="Siempre obligatorio." checked disabled onCheckedChange={() => undefined} />
        {CLIENT_REQUIRED_FIELD_OPTIONS.map((field) => (
          <SwitchField
            key={field.key}
            label={field.label}
            description={DESCRIPTIONS[field.key]}
            checked={values[field.key]}
            onCheckedChange={(checked) => setField(field.key, checked)}
          />
        ))}
      </div>
    </SettingsSection>
  );
}
