import { Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { useCategories } from "@/hooks/queries/use-categories";
import { getErrorMessage } from "@/lib/data";
import type { Business } from "@/types";
import { SwitchField } from "./switch-field";

/** Activa la historia clínica del negocio (por defecto, en negocios de salud). */
export function ClinicalSettingsCard({ business }: { business: Business }) {
  const updateBusiness = useUpdateBusiness();
  const isHealth = Boolean(useCategories().find(business.category)?.isHealth);

  const toggle = async (enabled: boolean) => {
    try {
      await updateBusiness.mutateAsync({ clinicalRecordsEnabled: enabled });
      toast.success(enabled ? "Historia clínica activada" : "Historia clínica desactivada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="size-4 text-primary" aria-hidden /> Historia clínica
        </CardTitle>
        <CardDescription>
          {isHealth
            ? "Recomendada para tu tipo de negocio."
            : "Pensada para negocios de salud: psicología, odontología, nutrición, fisioterapia…"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SwitchField
          label="Registrar historias clínicas de mis pacientes"
          description="Antecedentes y evoluciones de cada consulta en la ficha del cliente. Sólo la ves tú y las personas que autorices en Equipo; cada acceso queda registrado y nada se puede borrar."
          checked={business.clinicalRecordsEnabled}
          disabled={updateBusiness.isPending}
          onCheckedChange={toggle}
        />
      </CardContent>
    </Card>
  );
}
