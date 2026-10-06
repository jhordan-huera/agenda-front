import { Building2, ExternalLink, Plus, Trash2, UserRoundPlus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateWeek } from "@/features/schedule/schedule-utils";
import { WeeklyScheduleEditor } from "@/features/schedule/weekly-schedule-editor";
import { useCreateBusiness } from "@/hooks/queries/use-admin";
import { useCategories } from "@/hooks/queries/use-categories";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { DEFAULT_WEEKLY_SCHEDULE, TIMEZONES } from "@/lib/constants/business";
import { PLANS } from "@/lib/constants/plans";
import { getErrorMessage, type AdminCreateBusinessResult } from "@/lib/data";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adminBusinessSchema } from "@/lib/validations/admin";
import type { ScheduleDayInput } from "@/lib/validations/schedule";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { BusinessCategory, BusinessCategoryInfo, PlanId } from "@/types";

interface ServiceRow {
  /** Identificador sólo para la lista (no se envía). */
  key: number;
  name: string;
  durationMinutes: string;
  price: string;
}

interface FormValues {
  name: string;
  category: BusinessCategory | "";
  slug: string;
  description: string;
  timezone: string;
  phone: string;
  email: string;
  address: string;
  plan: PlanId;
  services: ServiceRow[];
  schedules: ScheduleDayInput[];
}

let nextKey = 1;
const serviceRow = (service?: BusinessCategoryInfo["suggestedService"]): ServiceRow => ({
  key: nextKey++,
  name: service?.name ?? "",
  durationMinutes: String(service?.durationMinutes ?? 60),
  price: service ? String(service.price) : "",
});

/** Semana completa (lunes → domingo) con copias independientes de los intervalos. */
const initialWeek = () => DEFAULT_WEEKLY_SCHEDULE.map((day) => ({ ...day, intervals: day.intervals.map((i) => ({ ...i })) }));

const initialValues = (): FormValues => ({
  name: "",
  category: "",
  slug: "",
  description: "",
  timezone: DEFAULT_TIMEZONE,
  phone: "",
  email: "",
  address: "",
  plan: "free",
  services: [serviceRow()],
  schedules: initialWeek(),
});

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
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [slugEdited, setSlugEdited] = useState(false);
  const [servicesEdited, setServicesEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [scheduleErrors, setScheduleErrors] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AdminCreateBusinessResult | null>(null);
  const { active: categories, find: findCategory } = useCategories();

  const clearError = (...keys: string[]) =>
    setErrors((current) => {
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    const suggestSlug = key === "name" && !slugEdited;
    // Mientras no se tocan los servicios, se propone el sugerido por el tipo de negocio.
    const suggestion = key === "category" && !servicesEdited ? findCategory(String(value))?.suggestedService : undefined;
    setValues((current) => ({
      ...current,
      [key]: value,
      // El enlace se sugiere a partir del nombre hasta que se edita a mano.
      ...(suggestSlug ? { slug: slugify(String(value)) } : {}),
      ...(suggestion ? { services: [serviceRow(suggestion)] } : {}),
    }));
    // El error de un campo desaparece en cuanto se corrige (y los de servicios, si se sugirió otro).
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([field]) => field !== key && !(suggestSlug && field === "slug") && !(suggestion && field.startsWith("services")),
        ),
      ),
    );
  };

  const updateService = (key: number, patch: Partial<Omit<ServiceRow, "key">>) => {
    setServicesEdited(true);
    setValues((current) => ({
      ...current,
      services: current.services.map((service) => (service.key === key ? { ...service, ...patch } : service)),
    }));
    const index = values.services.findIndex((service) => service.key === key);
    clearError("services", ...Object.keys(patch).map((field) => `services.${index}.${field}`));
  };
  const addService = () => {
    setServicesEdited(true);
    setValues((current) => ({ ...current, services: [...current.services, serviceRow()] }));
    clearError("services");
  };
  // Al quitar una fila cambian los índices: los errores de servicios se recalculan al guardar.
  const removeService = (key: number) => {
    setServicesEdited(true);
    setValues((current) => ({ ...current, services: current.services.filter((service) => service.key !== key) }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith("services"))));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const weekErrors = validateWeek(values.schedules);
    const validation = validate(adminBusinessSchema, {
      ...values,
      services: values.services.map(({ key: _key, ...service }) => service),
    });
    setScheduleErrors(weekErrors);
    setErrors(validation.errors);
    if (!validation.success || Object.keys(weekErrors).length > 0) {
      // El formulario es largo: se lleva al primer campo con error.
      requestAnimationFrame(() =>
        formRef.current?.querySelector("[aria-invalid=true], [data-invalid]")?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
      return;
    }
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
          <DialogTitle>{result.business.name} ya está creado</DialogTitle>
          <DialogDescription>Con sus servicios y su horario: su página de reservas ya funciona.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Página de reservas:{" "}
          <a href={`/book/${result.business.slug}`} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
            /book/{result.business.slug}
            <ExternalLink className="ml-1 inline size-3.5" aria-hidden />
          </a>
        </p>
        <p className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <UserRoundPlus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          Aún no tiene usuarios. Cuando tengas sus datos, agrega a su propietario desde la ficha del negocio (Agregar
          propietario): le llegará un email con su acceso.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Listo
          </Button>
          <Button asChild>
            <Link to={`/admin/businesses/${result.business.id}`} onClick={onDone}>
              Ver negocio
            </Link>
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="size-5 text-primary" aria-hidden /> Nuevo negocio
        </DialogTitle>
        <DialogDescription>
          Deja listo el negocio con sus servicios y su horario. Su propietario se agrega después, desde la ficha del negocio.
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
        <FormField label="Descripción" optional error={errors.description} hint="La ven los clientes en su página de reservas.">
          {(field) => (
            <Textarea
              {...field}
              rows={3}
              placeholder="Qué ofrece, su especialidad, a quién atiende…"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Teléfono" optional error={errors.phone}>
            {(field) => <Input {...field} type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />}
          </FormField>
          <FormField
            label="Email del negocio"
            optional
            error={errors.email}
            hint="Recibe los avisos de reservas. Vacío: el del propietario, cuando lo agregues."
          >
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

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold">Servicios</legend>
        <p className="text-xs text-muted-foreground">
          Con su duración se calculan las horas libres. Precio 0: no se muestra (luego puede marcarse «Gratis» en Servicios).
        </p>
        <div className="grid gap-3">
          {values.services.map((service, index) => (
            <ServiceRowFields
              key={service.key}
              index={index}
              service={service}
              errors={errors}
              onChange={(patch) => updateService(service.key, patch)}
              onRemove={values.services.length > 1 ? () => removeService(service.key) : undefined}
            />
          ))}
        </div>
        {errors.services && (
          <p data-invalid className="text-xs font-medium text-destructive">
            {errors.services}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={addService} disabled={values.services.length >= 20}>
          <Plus /> Agregar servicio
        </Button>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold">Horario de atención</legend>
        <p className="text-xs text-muted-foreground">Puede tener varios intervalos por día (p. ej. mañana y tarde).</p>
        <div data-invalid={Object.keys(scheduleErrors).length > 0 || errors.schedules ? true : undefined}>
          <WeeklyScheduleEditor
            value={values.schedules}
            onChange={(schedules) => {
              set("schedules", schedules);
              setScheduleErrors({});
            }}
            errors={scheduleErrors}
          />
        </div>
        {errors.schedules && <p className="text-xs font-medium text-destructive">{errors.schedules}</p>}
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

function ServiceRowFields({
  index,
  service,
  errors,
  onChange,
  onRemove,
}: {
  index: number;
  service: ServiceRow;
  errors: FieldErrors;
  onChange: (patch: Partial<Omit<ServiceRow, "key">>) => void;
  /** Sin él, la fila no se puede quitar (hace falta al menos un servicio). */
  onRemove?: () => void;
}) {
  const error = (field: string) => errors[`services.${index}.${field}`];
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_7rem_7rem_auto]">
      <FormField label="Servicio" error={error("name")} className="col-span-2 sm:col-span-1">
        {(field) => (
          <Input {...field} placeholder="Ej.: Consulta inicial" value={service.name} onChange={(e) => onChange({ name: e.target.value })} />
        )}
      </FormField>
      <div className="col-span-2 grid grid-cols-[1fr_1fr_auto] gap-2 sm:contents">
        <FormField label="Minutos" error={error("durationMinutes")}>
          {(field) => (
            <Input
              {...field}
              type="number"
              inputMode="numeric"
              min={5}
              step={5}
              value={service.durationMinutes}
              onChange={(e) => onChange({ durationMinutes: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Precio (USD)" error={error("price")}>
          {(field) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                {...field}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                className="pl-6"
                value={service.price}
                onChange={(e) => onChange({ price: e.target.value })}
              />
            </div>
          )}
        </FormField>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-6"
          aria-label={`Quitar ${service.name || "este servicio"}`}
          disabled={!onRemove}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
