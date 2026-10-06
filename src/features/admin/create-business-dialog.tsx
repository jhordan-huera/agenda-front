import { Building2, ExternalLink, MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBusiness } from "@/hooks/queries/use-admin";
import { useCategories } from "@/hooks/queries/use-categories";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { TIMEZONES } from "@/lib/constants/business";
import { PLANS } from "@/lib/constants/plans";
import { getErrorMessage, type AdminCreateBusinessResult } from "@/lib/data";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adminBusinessSchema } from "@/lib/validations/admin";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { BusinessCategory, PlanId } from "@/types";

interface FormValues {
  name: string;
  category: BusinessCategory | "";
  slug: string;
  timezone: string;
  phone: string;
  email: string;
  address: string;
  plan: PlanId;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;
}

const INITIAL_VALUES: FormValues = {
  name: "",
  category: "",
  slug: "",
  timezone: DEFAULT_TIMEZONE,
  phone: "",
  email: "",
  address: "",
  plan: "free",
  ownerFirstName: "",
  ownerLastName: "",
  ownerEmail: "",
  ownerPassword: "",
};

export function CreateBusinessDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {/* Se monta de nuevo en cada apertura: el formulario empieza vacío. */}
        {open && <CreateBusinessForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CreateBusinessForm({ onDone }: { onDone: () => void }) {
  const createBusiness = useCreateBusiness();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<AdminCreateBusinessResult | null>(null);
  const { active: categories, find: findCategory } = useCategories();

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    const suggestSlug = key === "name" && !slugEdited;
    setValues((current) => ({
      ...current,
      [key]: value,
      // El enlace se sugiere a partir del nombre hasta que se edita a mano.
      ...(suggestSlug ? { slug: slugify(String(value)) } : {}),
    }));
    // El error de un campo desaparece en cuanto se corrige.
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      if (suggestSlug) delete next.slug;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(adminBusinessSchema, values);
    setErrors(validation.errors);
    if (!validation.success) return;
    try {
      setResult(await createBusiness.mutateAsync(validation.data));
      toast.success("Negocio creado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (result) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>{result.business.name} ya está listo</DialogTitle>
          <DialogDescription>
            Enviamos un email a {result.ownerEmail} con su contraseña y el enlace de su página de reservas.
          </DialogDescription>
        </DialogHeader>
        <p className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <MailCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {result.existingAccount
            ? "El email ya tenía cuenta: se le asignó el negocio y la contraseña que escribiste."
            : "Entrará con su email y la contraseña que escribiste."}
        </p>
        <p className="text-sm text-muted-foreground">
          Página de reservas:{" "}
          <a href={`/book/${result.business.slug}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            /book/{result.business.slug}
            <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
          </a>
        </p>
        <DialogFooter>
          <Button asChild variant="outline">
            <Link to={`/admin/businesses/${result.business.id}`} onClick={onDone}>
              Ver negocio
            </Link>
          </Button>
          <Button onClick={onDone}>Listo</Button>
        </DialogFooter>
      </>
    );
  }

  const suggestion = values.category ? (findCategory(values.category)?.suggestedService ?? null) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" aria-hidden /> Nuevo negocio
        </DialogTitle>
        <DialogDescription>
          Crea el negocio y la cuenta de su propietario. Le enviaremos un email con su contraseña.
        </DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-4">
        <legend className="mb-3 text-sm font-semibold">Negocio</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre del negocio" error={errors.name}>
            {(field) => <Input {...field} autoFocus value={values.name} onChange={(e) => set("name", e.target.value)} />}
          </FormField>
          <FormField label="Tipo de negocio" error={errors.category}>
            {(field) => (
              <Select value={values.category} onValueChange={(category) => set("category", category as BusinessCategory)}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue placeholder="Selecciona…" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="Enlace de reservas" error={errors.slug} hint={`Su página pública será /book/${values.slug || "…"}`}>
          {(field) => (
            <div
              className={cn(
                "flex h-8 items-center rounded-lg border border-input px-2.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                errors.slug && "border-destructive ring-3 ring-destructive/20",
              )}
            >
              <span className="text-muted-foreground">/book/</span>
              <input
                {...field}
                className="h-full min-w-0 flex-1 bg-transparent outline-none"
                value={values.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  set("slug", e.target.value.toLowerCase());
                }}
              />
            </div>
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Teléfono" optional error={errors.phone}>
            {(field) => <Input {...field} type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />}
          </FormField>
          <FormField label="Email del negocio" optional error={errors.email} hint="Si lo dejas vacío, se usa el del propietario.">
            {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />}
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Dirección" optional error={errors.address}>
            {(field) => <Input {...field} value={values.address} onChange={(e) => set("address", e.target.value)} />}
          </FormField>
          <FormField label="Zona horaria" error={errors.timezone}>
            {(field) => (
              <Select value={values.timezone} onValueChange={(timezone) => set("timezone", timezone)}>
                <SelectTrigger {...field} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-3 text-sm font-semibold">Propietario</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre" error={errors.ownerFirstName}>
            {(field) => (
              <Input {...field} value={values.ownerFirstName} onChange={(e) => set("ownerFirstName", e.target.value)} />
            )}
          </FormField>
          <FormField label="Apellido" error={errors.ownerLastName}>
            {(field) => <Input {...field} value={values.ownerLastName} onChange={(e) => set("ownerLastName", e.target.value)} />}
          </FormField>
        </div>
        <FormField
          label="Email del propietario"
          error={errors.ownerEmail}
          hint="Si ya tiene una cuenta sin negocio, se le asigna este negocio."
        >
          {(field) => (
            <Input {...field} type="email" value={values.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} />
          )}
        </FormField>
        <FormField
          label="Contraseña del propietario"
          error={errors.ownerPassword}
          hint="Mínimo 8 caracteres. Se la enviaremos por email; el usuario no puede cambiarla."
        >
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              className="font-mono"
              value={values.ownerPassword}
              onChange={(e) => set("ownerPassword", e.target.value)}
            />
          )}
        </FormField>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Plan</legend>
        <div role="radiogroup" aria-label="Plan" className="grid gap-2 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const selected = values.plan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => set("plan", plan.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && "border-primary bg-accent hover:bg-accent",
                )}
              >
                <span className="block text-sm font-medium">{plan.name}</span>
                <span className="block text-xs text-muted-foreground">{plan.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        Se crea con horario de lunes a viernes 08:00–17:00 y sábado 09:00–13:00
        {suggestion ? ` y el servicio "${suggestion.name}"` : " y un servicio sugerido según el tipo"}, para que pueda recibir
        reservas desde el primer día. El propietario puede cambiarlos después.
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={createBusiness.isPending} loadingText="Creando…">
          Crear negocio
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
