import { UserRoundPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAssignBusinessOwner } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { businessOwnerSchema, type BusinessOwnerInput } from "@/lib/validations/admin";
import { validate, type FieldErrors } from "@/lib/validations/validate";

const EMPTY: BusinessOwnerInput = { firstName: "", lastName: "", email: "", password: "" };

/** Propietario de un negocio creado sin él (con la contraseña que elige el super admin). */
export function AddOwnerDialog({
  businessId,
  businessName,
  open,
  onOpenChange,
}: {
  businessId: string;
  businessName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Se monta de nuevo en cada apertura: el formulario empieza vacío. */}
        {open && <AddOwnerForm businessId={businessId} businessName={businessName} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function AddOwnerForm({ businessId, businessName, onDone }: { businessId: string; businessName: string; onDone: () => void }) {
  const assignOwner = useAssignBusinessOwner();
  const [values, setValues] = useState<BusinessOwnerInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof BusinessOwnerInput>(key: K, value: BusinessOwnerInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(businessOwnerSchema, values);
    setErrors(validation.errors);
    if (!validation.success) return;
    try {
      const owner = await assignOwner.mutateAsync({ businessId, input: validation.data });
      toast.success(`Propietario agregado: ${owner.firstName} ${owner.lastName}`, {
        description: `Le enviamos su email de acceso y la contraseña a ${owner.email}.`,
      });
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserRoundPlus className="size-5 text-primary" aria-hidden /> Propietario de {businessName}
        </DialogTitle>
        <DialogDescription>
          Entrará con su email y la contraseña que escribas; se la enviamos por email junto con su página de reservas.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" error={errors.firstName}>
          {(field) => <Input {...field} autoFocus value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />}
        </FormField>
        <FormField label="Apellido" error={errors.lastName}>
          {(field) => <Input {...field} value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />}
        </FormField>
      </div>
      <FormField label="Email" error={errors.email} hint="Si ya tiene una cuenta sin negocio, se le asigna este negocio.">
        {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />}
      </FormField>
      <FormField label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres. Apúntala: el usuario no puede cambiarla.">
        {(field) => (
          <Input
            {...field}
            autoComplete="off"
            className="font-mono"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
          />
        )}
      </FormField>
      <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        Si el negocio tiene una sola agenda, pasa a ser la suya. Con varias, vincúlalo a la suya en Gestionar negocio →
        Profesionales.
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={assignOwner.isPending} loadingText="Creando…">
          Agregar propietario
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
