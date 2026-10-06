import { Check } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSaveService } from "@/hooks/queries/use-services";
import { SERVICE_MODES } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import { serviceSchema } from "@/lib/validations/service";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Service, ServiceMode } from "@/types";
import { MODE_ICONS } from "./mode-icons";

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
        <ServiceForm key={service?.id ?? "new"} service={service} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Qué ven los clientes del precio. */
type PriceDisplay = "show" | "free" | "hidden";

const PRICE_DISPLAYS: { value: PriceDisplay; label: string; description: string }[] = [
  { value: "show", label: "Mostrar el precio", description: "Los clientes ven el precio al reservar y en sus emails." },
  { value: "free", label: "Gratis", description: "Los clientes ven «Gratis»." },
  {
    value: "hidden",
    label: "No mostrar",
    description: "Ni el precio ni «Gratis»: se lo indicas tú (precio a consultar). Tú sí lo ves en la agenda y los reportes.",
  },
];

function initialPriceDisplay(service?: Service): PriceDisplay {
  if (!service) return "show";
  if (!service.showPrice) return "hidden";
  return service.price === 0 ? "free" : "show";
}

function ServiceForm({ service, onDone }: { service?: Service; onDone: () => void }) {
  const saveService = useSaveService();
  const [values, setValues] = useState({
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: String(service?.durationMinutes ?? 60),
    price: service && service.price > 0 ? String(service.price) : "",
    priceDisplay: initialPriceDisplay(service),
    modes: service?.modes ?? (["business"] as ServiceMode[]),
    homeVisitFee: String(service?.homeVisitFee ?? 0),
    isActive: service?.isActive ?? true,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const toggleMode = (mode: ServiceMode) =>
    set(
      "modes",
      values.modes.includes(mode)
        ? values.modes.filter((m) => m !== mode)
        : SERVICE_MODES.map((option) => option.value).filter((m) => m === mode || values.modes.includes(m)),
    );
  const free = values.priceDisplay === "free";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { priceDisplay, ...rest } = values;
    const result = validate(serviceSchema, {
      ...rest,
      price: free ? 0 : rest.price || "0",
      showPrice: priceDisplay !== "hidden",
      homeVisitFee: rest.modes.includes("home") ? rest.homeVisitFee : 0,
    });
    // "Mostrar el precio" sin precio sería "Gratis": que lo elija a propósito.
    const priceMissing = result.success && priceDisplay === "show" && result.data.price === 0;
    setErrors(priceMissing ? { price: "Escribe el precio, o elige «Gratis»" } : result.errors);
    if (!result.success || priceMissing) return;

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
        <FormField label="Precio (USD)" error={errors.price}>
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
                placeholder={free ? "0" : "25"}
                className="pl-6"
                disabled={free}
                value={free ? "0" : values.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </div>
          )}
        </FormField>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">El precio en tu página de reservas</legend>
        <div role="radiogroup" aria-label="El precio en tu página de reservas" className="grid gap-2 sm:grid-cols-3">
          {PRICE_DISPLAYS.map((option) => {
            const selected = values.priceDisplay === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  set("priceDisplay", option.value);
                  setErrors((current) => ({ ...current, price: "" }));
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && "border-primary bg-accent hover:bg-accent",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {PRICE_DISPLAYS.find((option) => option.value === values.priceDisplay)?.description}
        </p>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Modalidad</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {SERVICE_MODES.map((mode) => {
            const checked = values.modes.includes(mode.value);
            const Icon = MODE_ICONS[mode.value];
            return (
              <button
                key={mode.value}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggleMode(mode.value)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  checked && "border-primary bg-accent hover:bg-accent",
                )}
              >
                <Icon className={cn("size-4 shrink-0", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
                <span className="flex-1">{mode.label}</span>
                {checked && <Check className="size-4 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>
        {errors.modes ? (
          <p className="text-xs font-medium text-destructive">{errors.modes}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {values.modes.length > 1
              ? `Con varias, el cliente elige al reservar.${values.modes.includes("virtual") ? " Lo virtual usa el enlace de cada profesional." : ""}`
              : SERVICE_MODES.find((mode) => mode.value === values.modes[0])?.description}
          </p>
        )}
      </fieldset>

      {values.modes.includes("home") && (
        <FormField label="Recargo a domicilio (USD)" error={errors.homeVisitFee} hint="Se suma al precio. 0 = sin recargo." className="sm:w-1/2">
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

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">Servicio activo</span>
          <span className="block text-xs text-muted-foreground">
            {values.isActive
              ? "Aparece en tu página de reservas."
              : "Inactivo: no aparece en tu página de reservas ni se puede agendar; sus citas se conservan."}
          </span>
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
