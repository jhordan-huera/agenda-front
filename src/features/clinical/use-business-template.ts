import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useClinicalTemplates } from "@/hooks/queries/use-clinical";
import { businessTemplate } from "@/lib/clinical-templates";

/** Qué formato se propone al registrar una evolución: el del negocio, en todas las citas. */
export function useBusinessTemplate(enabled = true) {
  const { data: business } = useCurrentBusiness();
  // Con los desactivados: así se reconocen también las evoluciones escritas con ellos.
  const templates = useClinicalTemplates(enabled, true);
  const template = businessTemplate(templates.data ?? []);
  return {
    templates,
    template,
    /** true si lo eligió el propietario; false si es el recomendado para la especialidad. */
    chosen: Boolean(template && business?.clinicalDefaultTemplateId === template.id),
  };
}
