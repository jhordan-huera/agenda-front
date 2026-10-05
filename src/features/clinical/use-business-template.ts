import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useClinicalTemplates } from "@/hooks/queries/use-clinical";
import { useServices } from "@/hooks/queries/use-services";
import { businessTemplate } from "@/lib/clinical-templates";
import type { ClinicalTemplate, Service } from "@/types";

export interface ServiceTemplateException {
  service: Service;
  template: ClinicalTemplate;
}

/**
 * Qué formato se propone al registrar una evolución: el del negocio y los servicios activos que
 * usan otro (en las citas de esos servicios se propone el suyo).
 */
export function useBusinessTemplate(enabled = true) {
  const { data: business } = useCurrentBusiness();
  // Con los desactivados: así se reconocen también las evoluciones escritas con ellos.
  const templates = useClinicalTemplates(enabled, true);
  const { data: services = [] } = useServices();
  const list = templates.data ?? [];
  const template = businessTemplate(list);
  const exceptions: ServiceTemplateException[] = services.flatMap((service) => {
    const own = list.find((t) => t.id === service.clinicalTemplateId && t.isActive);
    return service.isActive && own && own.id !== template?.id ? [{ service, template: own }] : [];
  });
  return {
    templates,
    template,
    /** true si lo eligió el propietario; false si es el recomendado para la especialidad. */
    chosen: Boolean(template && business?.clinicalDefaultTemplateId === template.id),
    exceptions,
  };
}
