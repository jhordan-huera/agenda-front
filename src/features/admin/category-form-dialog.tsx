import { Tags } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CATEGORY_ICONS } from "@/features/categories/category-icons";
import { SwitchField } from "@/features/settings/switch-field";
import { useSaveCategory } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import { businessCategoryInputSchema } from "@/lib/validations/admin";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { BusinessCategoryInfo } from "@/types";

interface FormValues {
  name: string;
  icon: string;
  isHealth: boolean;
  suggestedServiceName: string;
  suggestedServiceDuration: string;
  suggestedServicePrice: string;
  isActive: boolean;
  sortOrder: string;
}

const toValues = (category: BusinessCategoryInfo | null): FormValues => ({
  name: category?.name ?? "",
  icon: category?.icon ?? "shapes",
  isHealth: category?.isHealth ?? false,
  suggestedServiceName: category?.suggestedService.name ?? "Consulta",
  suggestedServiceDuration: String(category?.suggestedService.durationMinutes ?? 60),
  suggestedServicePrice: String(category?.suggestedService.price ?? 25),
  isActive: category?.isActive ?? true,
  sortOrder: String(category?.sortOrder ?? 100),
});

/** Crear o editar una categoría de negocio (panel del super admin). `category` null = nueva. */
export function CategoryFormDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean;
  category: BusinessCategoryInfo | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {/* Se monta de nuevo en cada apertura: el formulario empieza con los datos de la categoría. */}
        {open && <CategoryForm category={category} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ category, onDone }: { category: BusinessCategoryInfo | null; onDone: () => void }) {
  const save = useSaveCategory();
  const [values, setValues] = useState<FormValues>(() => toValues(category));
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(businessCategoryInputSchema, values);
    setErrors(validation.errors);
    if (!validation.success) return;
    try {
      const saved = await save.mutateAsync({ id: category?.id, input: validation.data });
      toast.success(category ? `Categoría ${saved.name} actualizada` : `Categoría ${saved.name} creada`);
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Tags className="size-5 text-primary" aria-hidden /> {category ? `Editar ${category.name}` : "Nueva categoría"}
        </DialogTitle>
        <DialogDescription>
          Los negocios la eligen al registrarse y en su configuración.
          {category && " Si cambias el nombre, se actualiza en todos los negocios que la usan."}
        </DialogDescription>
      </DialogHeader>

      <FormField label="Nombre" error={errors.name}>
        {(field) => <Input {...field} autoFocus value={values.name} onChange={(e) => set("name", e.target.value)} />}
      </FormField>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Ícono</legend>
        <div role="radiogroup" aria-label="Ícono" className="grid grid-cols-10 gap-1.5">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => {
            const selected = values.icon === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={key}
                title={key}
                onClick={() => set("icon", key)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && "border-primary bg-accent text-primary hover:bg-accent",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Servicio sugerido</legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Se propone como primer servicio al crear un negocio de esta categoría.
        </p>
        <FormField label="Nombre del servicio" error={errors.suggestedServiceName}>
          {(field) => (
            <Input {...field} value={values.suggestedServiceName} onChange={(e) => set("suggestedServiceName", e.target.value)} />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Duración (min)" error={errors.suggestedServiceDuration}>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={5}
                step={5}
                value={values.suggestedServiceDuration}
                onChange={(e) => set("suggestedServiceDuration", e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Precio" error={errors.suggestedServicePrice}>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={0}
                step="0.01"
                value={values.suggestedServicePrice}
                onChange={(e) => set("suggestedServicePrice", e.target.value)}
              />
            )}
          </FormField>
        </div>
      </fieldset>

      <SwitchField
        label="Negocio de salud"
        description="La historia clínica viene activada al crear un negocio de esta categoría."
        checked={values.isHealth}
        onCheckedChange={(checked) => set("isHealth", checked)}
      />
      <SwitchField
        label="Activa"
        description="Si la desactivas, deja de ofrecerse a negocios nuevos; los que ya la tienen la conservan."
        checked={values.isActive}
        onCheckedChange={(checked) => set("isActive", checked)}
      />
      <FormField label="Orden" error={errors.sortOrder} hint="Las de número menor aparecen primero.">
        {(field) => (
          <Input
            {...field}
            type="number"
            min={0}
            className="w-28"
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        )}
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={save.isPending} loadingText="Guardando…">
          {category ? "Guardar cambios" : "Crear categoría"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
