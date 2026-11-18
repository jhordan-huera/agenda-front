import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSaveLoyaltyBenefit } from "@/hooks/queries/use-loyalty";
import { useServices } from "@/hooks/queries/use-services";
import { BENEFIT_KINDS, LOYALTY_MAX_VALID_DAYS, LOYALTY_MAX_VISITS, describeBenefit } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { loyaltyBenefitSchema } from "@/lib/validations/loyalty";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { LoyaltyBenefit, LoyaltyBenefitKind } from "@/types";

/**
 * «+ Agregar beneficio» y «Editar» (spec 052): el nombre, las citas necesarias, el tipo con su valor (o el servicio
 * gratis), las condiciones y en cuántos días vence. Editarlo no cambia lo que ya se ganó.
 */
export function BenefitFormDialog({
  open,
  onOpenChange,
  benefit,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sin él: uno nuevo. */
  benefit?: LoyaltyBenefit;
  currency?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{benefit ? "Editar beneficio" : "Nuevo beneficio"}</DialogTitle>
          <DialogDescription>
            {benefit
              ? "Vale para lo que viene: las recompensas ya ganadas quedan como estaban."
              : "El paciente lo gana al llegar a esas citas atendidas, con un código para canjearlo."}
          </DialogDescription>
        </DialogHeader>
        {open && <BenefitForm key={benefit?.id ?? "new"} benefit={benefit} currency={currency} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/** Los números del formulario van como texto: vacío es «sin valor». */
const toNumber = (text: string) => (text.trim() === "" ? null : Number(text.replace(",", ".")));

function BenefitForm({ benefit, currency, onDone }: { benefit?: LoyaltyBenefit; currency?: string; onDone: () => void }) {
  const save = useSaveLoyaltyBenefit();
  const servicesQuery = useServices();
  const services = (servicesQuery.data ?? []).filter((service) => service.isActive || service.id === benefit?.serviceId);
  const [values, setValues] = useState({
    name: benefit?.name ?? "",
    description: benefit?.description ?? "",
    visitsRequired: benefit ? String(benefit.visitsRequired) : "",
    kind: benefit?.kind ?? ("percent" as LoyaltyBenefitKind),
    value: benefit?.value != null ? String(benefit.value) : "",
    serviceId: benefit?.serviceId ?? "",
    conditions: benefit?.conditions ?? "",
    validDays: benefit?.validDays != null ? String(benefit.validDays) : "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const withValue = values.kind === "percent" || values.kind === "fixed";
  const serviceName = services.find((service) => service.id === values.serviceId)?.name ?? null;
  const visits = toNumber(values.visitsRequired);
  const amount = toNumber(values.value);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(loyaltyBenefitSchema, {
      name: values.name,
      description: values.description,
      // undefined: «Escribe cuántas citas hacen falta».
      visitsRequired: visits ?? undefined,
      kind: values.kind,
      value: withValue ? amount : null,
      serviceId: values.kind === "free_service" ? values.serviceId || null : null,
      conditions: values.conditions,
      validDays: toNumber(values.validDays),
      isActive: benefit?.isActive ?? true,
    });
    setErrors(result.errors);
    if (!result.success) return;
    try {
      await save.mutateAsync({ id: benefit?.id, input: result.data });
      toast.success(benefit ? "Beneficio guardado" : `Beneficio «${result.data.name}» creado`);
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const previewAmount = amount !== null && Number.isFinite(amount) && amount > 0 ? amount : null;
  const preview =
    visits !== null && Number.isInteger(visits) && visits > 0 && (!withValue || previewAmount !== null)
      ? `Lo gana al llegar a ${visits === 1 ? "1 cita atendida" : `${visits} citas atendidas`}: ${describeBenefit(values.kind, previewAmount, serviceName, currency)}.`
      : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormField label="Nombre" error={errors.name}>
        {(field) => (
          <Input
            {...field}
            autoFocus
            maxLength={80}
            placeholder="Ej.: Limpieza con 50 % de descuento"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
          />
        )}
      </FormField>
      <FormField label="Descripción" error={errors.description} optional>
        {(field) => (
          <Textarea
            {...field}
            rows={2}
            maxLength={300}
            placeholder="Lo que ve el paciente en su tarjeta."
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
          />
        )}
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Citas necesarias" error={errors.visitsRequired} hint={`De 1 a ${LOYALTY_MAX_VISITS}.`}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={1}
              max={LOYALTY_MAX_VISITS}
              step={1}
              placeholder="5"
              value={values.visitsRequired}
              onChange={(event) => set("visitsRequired", event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Tipo" error={errors.kind}>
          {(field) => (
            <Select value={values.kind} onValueChange={(kind) => set("kind", kind as LoyaltyBenefitKind)}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {BENEFIT_KINDS.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>

      {values.kind === "percent" && (
        <FormField label="Descuento (%)" error={errors.value} hint="De 1 a 100. Baja el precio de la cita en la que se canjea." className="sm:w-1/2">
          {(field) => (
            <div className="relative">
              <Input
                {...field}
                type="number"
                inputMode="decimal"
                min={1}
                max={100}
                step="1"
                placeholder="50"
                className="pr-7"
                value={values.value}
                onChange={(event) => set("value", event.target.value)}
              />
              <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          )}
        </FormField>
      )}
      {values.kind === "fixed" && (
        <FormField
          label={`Descuento (${currency ?? "USD"})`}
          error={errors.value}
          hint="Se resta del precio de la cita en la que se canjea, sin bajar de 0."
          className="sm:w-1/2"
        >
          {(field) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                {...field}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="10"
                className="pl-6"
                value={values.value}
                onChange={(event) => set("value", event.target.value)}
              />
            </div>
          )}
        </FormField>
      )}
      {values.kind === "free_service" && (
        <FormField label="Servicio gratis" error={errors.serviceId} hint="La cita en la que se canjea queda en $0.">
          {(field) => (
            <Select value={values.serviceId} onValueChange={(serviceId) => set("serviceId", serviceId)}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue placeholder={services.length ? "Elige el servicio" : "Todavía no tienes servicios"} />
              </SelectTrigger>
              <SelectContent position="popper">
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      )}
      {values.kind === "free_appointment" && <p className="text-xs text-muted-foreground">La cita en la que se canjea queda en $0.</p>}
      {values.kind === "custom" && (
        <p className="text-xs text-muted-foreground">Sólo el texto (por ejemplo, un regalo): no cambia el precio de la cita.</p>
      )}

      <FormField label="Condiciones" error={errors.conditions} optional>
        {(field) => (
          <Input
            {...field}
            maxLength={300}
            placeholder="Ej.: No acumulable con otras promociones"
            value={values.conditions}
            onChange={(event) => set("conditions", event.target.value)}
          />
        )}
      </FormField>
      <FormField
        label="Vence a los (días)"
        error={errors.validDays}
        optional
        hint="Contados desde que lo gana. Vacío: no vence."
        className="sm:w-1/2"
      >
        {(field) => (
          <Input
            {...field}
            type="number"
            inputMode="numeric"
            min={1}
            max={LOYALTY_MAX_VALID_DAYS}
            step={1}
            placeholder="No vence"
            value={values.validDays}
            onChange={(event) => set("validDays", event.target.value)}
          />
        )}
      </FormField>

      {preview && (
        <p role="status" className="rounded-lg bg-muted/60 p-3 text-sm">
          {preview}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          Cancelar
        </Button>
        <SubmitButton loading={save.isPending} loadingText="Guardando…">
          {benefit ? "Guardar" : "Agregar beneficio"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
