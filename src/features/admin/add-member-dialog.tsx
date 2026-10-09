import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddBusinessMember } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import { adminMemberSchema, type AdminMemberInput } from "@/lib/validations/admin";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { BusinessRole } from "@/types";

type AssignableRole = Exclude<BusinessRole, "owner">;

const EMPTY: AdminMemberInput = { firstName: "", lastName: "", email: "", role: "staff", password: "" };

/** Alta de un miembro del equipo de un negocio por el super admin (con la contraseña que elige). */
export function AddMemberDialog({
  businessId,
  businessName,
  allowProfessionalRole = true,
  open,
  onOpenChange,
}: {
  businessId: string;
  businessName: string;
  /** El rol Profesional sólo existe con varias agendas (plan Business). */
  allowProfessionalRole?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Se monta de nuevo en cada apertura: el formulario empieza vacío. */}
        {open && (
          <AddMemberForm
            businessId={businessId}
            businessName={businessName}
            roles={ASSIGNABLE_ROLES.filter((role) => allowProfessionalRole || role !== "professional")}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddMemberForm({
  businessId,
  businessName,
  roles,
  onDone,
}: {
  businessId: string;
  businessName: string;
  roles: BusinessRole[];
  onDone: () => void;
}) {
  const addMember = useAddBusinessMember();
  const [values, setValues] = useState<AdminMemberInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = <K extends keyof AdminMemberInput>(key: K, value: AdminMemberInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(adminMemberSchema, values);
    setErrors(validation.errors);
    if (!validation.success) return;
    try {
      const member = await addMember.mutateAsync({ businessId, input: validation.data });
      toast.success(`${member.firstName} ya es parte del equipo. Le enviamos sus datos de acceso a ${member.email}`);
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" aria-hidden /> Agregar al equipo de {businessName}
        </DialogTitle>
        <DialogDescription>Le enviaremos un email con su email de acceso y la contraseña que escribas.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nombre" error={errors.firstName}>
          {(field) => <Input {...field} autoFocus value={values.firstName} onChange={(e) => set("firstName", e.target.value)} />}
        </FormField>
        <FormField label="Apellido" error={errors.lastName}>
          {(field) => <Input {...field} value={values.lastName} onChange={(e) => set("lastName", e.target.value)} />}
        </FormField>
      </div>
      <FormField label="Email" error={errors.email}>
        {(field) => <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />}
      </FormField>
      <FormField label="Rol" error={errors.role} hint={ROLE_DESCRIPTIONS[values.role]}>
        {(field) => (
          <Select value={values.role} onValueChange={(role) => set("role", role as AssignableRole)}>
            <SelectTrigger {...field} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={addMember.isPending} loadingText="Creando…">
          Agregar al equipo
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
