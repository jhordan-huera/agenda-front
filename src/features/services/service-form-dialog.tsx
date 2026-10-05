import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useClinicalAccess } from "@/features/clinical/use-clinical-access";
import { useClinicalTemplates } from "@/hooks/queries/use-clinical";
import { useSaveService } from "@/hooks/queries/use-services";
import { SERVICE_LOCATIONS } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { serviceSchema } from "@/lib/validations/service";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Service, ServiceLocation } from "@/types";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service;
}

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            La duración se usa para calcular las horas disponibles en tu página de reservas.
          </DialogDescription>
        </DialogHeader>
        <ServiceForm service={service} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

const NO_TEMPLATE = "none";

function ServiceForm({ service, onDone }: { service?: Service; onDone: () => void }) {
  const saveService = useSaveService();
  const [values, setValues] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: String(service?.durationMinutes ?? 60),
    price: String(service?.price ?? ""),
    showPrice: service?.showPrice ?? true,
    location: service?.location ?? ("business" as ServiceLocation),
    homeVisitFee: String(service?.homeVisitFee ?? 0),
    clinicalTemplateId: service?.clinicalTemplateId ?? null,
    isActive: service?.isActive ?? true,
  });
  // Formato de historia clínica: sólo si el negocio la usa y el usuario tiene acceso.
  const clinicalAccess = useClinicalAccess();
  const templates = useClinicalTemplates(clinicalAccess);
  const templateOptions = (templates.data ?? []).filter(
    (template) => template.isActive || template.id === values.clinicalTemplateId,
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(serviceSchema, values);
    setErrors(result.errors);
    if (!result.success) return;

    try {
      await saveService.mutateAsync({ id: service?.id, input: result.data });
      toast.success(service ? "Servicio actualizado" : "Servicio creado");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField label="Nombre" error={errors.name}>
        {(field) => (
          <Input
            {...field}
            autoFocus
            placeholder="Ej.: Consulta inicial"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
          />
        )}
      </FormField>
      <FormField label="Descripción" error={errors.description} optional>
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            placeholder="Qué incluye el servicio…"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Duración (minutos)" error={errors.durationMinutes}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={5}
              step={5}
              value={values.durationMinutes}
              onChange={(e) => set("durationMinutes", e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Precio (USD)" error={errors.price} hint="Con 0, el precio no se muestra a los clientes.">
          {(field) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                {...field}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                className="pl-6"
                value={values.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
          )}
        </FormField>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">Mostrar el precio a los clientes</span>
          <span className="block text-xs text-muted-foreground">
            Si lo desactivas, o si el precio es 0, en tu página de reservas y en los emails no aparecerá ningún precio.
          </span>
        </span>
        <Switch checked={values.showPrice} onCheckedChange={(checked) => set("showPrice", checked)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Dónde se presta"
          error={errors.location}
          hint={SERVICE_LOCATIONS.find((option) => option.value === values.location)?.description}
        >
          {(field) => (
            <Select value={values.location} onValueChange={(location) => set("location", location as ServiceLocation)}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {SERVICE_LOCATIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        {values.location !== "business" && (
          <FormField label="Recargo a domicilio (USD)" error={errors.homeVisitFee} hint="Se suma al precio. 0 = sin recargo.">
            {(field) => (
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  {...field}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="pl-6"
                  value={values.homeVisitFee}
                  onChange={(e) => set("homeVisitFee", e.target.value)}
                />
              </div>
            )}
          </FormField>
        )}
      </div>
      {clinicalAccess && templateOptions.length > 0 && (
        <FormField
          label="Formato de historia clínica"
          error={errors.clinicalTemplateId}
          hint="Se propone al registrar la evolución de una cita de este servicio."
        >
          {(field) => (
            <Select
              value={values.clinicalTemplateId ?? NO_TEMPLATE}
              onValueChange={(id) => set("clinicalTemplateId", id === NO_TEMPLATE ? null : id)}
            >
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                <SelectItem value={NO_TEMPLATE}>El habitual (el de la última evolución del paciente)</SelectItem>
                {templateOptions.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      )}
      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">Servicio activo</span>
          <span className="block text-xs text-muted-foreground">Sólo los activos aparecen en tu página de reservas.</span>
        </span>
        <Switch checked={values.isActive} onCheckedChange={(checked) => set("isActive", checked)} />
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={saveService.isPending}>{service ? "Guardar cambios" : "Crear servicio"}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
