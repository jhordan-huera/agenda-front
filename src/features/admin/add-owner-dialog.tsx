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
import type { AddedTeamMember } from "@/types";
import { AccountCreatedStep } from "./password-link-panel";

const EMPTY: BusinessOwnerInput = { firstName: "", lastName: "", email: "" };

/** Propietario de un negocio creado sin él: recibe un enlace de un solo uso para definir su contraseña. */
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
  const [added, setAdded] = useState<AddedTeamMember | null>(null);
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
      setAdded(await assignOwner.mutateAsync({ businessId, input: validation.data }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (added) {
    return (
      <AccountCreatedStep
        title={`Propietario agregado: ${added.member.firstName} ${added.member.lastName}`}
        description="Con el enlace define su contraseña; el email también lleva su página de reservas."
        link={added.passwordLink}
        firstName={added.member.firstName}
        onDone={onDone}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserRoundPlus className="size-5 text-primary" aria-hidden /> Propietario de {businessName}
        </DialogTitle>
        <DialogDescription>
          Le enviaremos por email un enlace de un solo uso para que defina su contraseña (nadie más la conoce), junto con su
          página de reservas.
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
      <FormField
        label="Email"
        error={errors.email}
        hint="Si ya tiene una cuenta sin negocio, se le asigna este negocio: su contraseña anterior deja de servir y define otra con el enlace."
      >
        {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />}
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
