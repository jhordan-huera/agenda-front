import { FileStack, Stethoscope } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessTemplate } from "@/features/clinical/use-business-template";
import { useClinicalTemplatesAccess } from "@/features/clinical/use-clinical-access";
import { useUpdateBusiness } from "@/hooks/queries/use-account";
import { useCategories } from "@/hooks/queries/use-categories";
import { getErrorMessage } from "@/lib/data";
import type { Business } from "@/types";
import { SwitchField } from "./switch-field";

/** Activa la historia clínica del negocio (por defecto, en negocios de salud). */
export function ClinicalSettingsCard({ business }: { business: Business }) {
  const updateBusiness = useUpdateBusiness();
  const isHealth = Boolean(useCategories().find(business.category)?.isHealth);
  // También en modo soporte: los formatos son plantillas, no datos de pacientes (spec 025).
  const { template } = useBusinessTemplate(useClinicalTemplatesAccess());

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
      <CardContent className="grid gap-4">
        <SwitchField
          label="Registrar historias clínicas de mis pacientes"
          description="Antecedentes y evoluciones de cada consulta en la ficha del cliente. Sólo la ves tú y las personas que autorices en Equipo (ni el soporte de Agenda360 puede verla); cada acceso queda registrado y nada se puede borrar."
          checked={business.clinicalRecordsEnabled}
          disabled={updateBusiness.isPending}
          onCheckedChange={toggle}
        />
        {business.clinicalRecordsEnabled && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-semibold">Formatos de historia clínica</span>
              <span className="block text-xs text-muted-foreground">
                {template ? (
                  <>
                    Tu negocio usa <span className="font-semibold text-ink">{template.name}</span>. Puedes elegir otro o crear los
                    tuyos (planes Pro y Business).
                  </>
                ) : (
                  "Qué se registra en cada evolución: los de tu especialidad o los tuyos (planes Pro y Business)."
                )}
              </span>
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/clinical-templates">
                <FileStack /> Gestionar formatos
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
