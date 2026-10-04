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
import { useCurrentBusiness } from "@/hooks/queries/use-account";
import { useSaveClient } from "@/hooks/queries/use-clients";
import { useErrorToast } from "@/hooks/use-error-toast";
import { documentIdError, documentIdMaxLength, onlyDigits } from "@/lib/identity";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { validate, type FieldErrors } from "@/lib/validations/validate";
import type { Client } from "@/types";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  /** Nombre inicial al crear (p. ej. lo que se escribió en el buscador de clientes). */
  defaultName?: string;
  onSaved?: (client: Client) => void;
}

export function ClientFormDialog({ open, onOpenChange, client, defaultName, onSaved }: ClientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {client ? "Actualiza los datos de contacto y las notas." : "Registra los datos de contacto de tu cliente."}
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          client={client}
          defaultName={defaultName}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onOpenChange(false);
            onSaved?.(saved);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({
  client,
  defaultName = "",
  onCancel,
  onSaved,
}: {
  client?: Client;
  defaultName?: string;
  onCancel: () => void;
  onSaved: (client: Client) => void;
}) {
  const saveClient = useSaveClient();
  const showError = useErrorToast();
  const { data: business } = useCurrentBusiness();
  const [values, setValues] = useState<ClientInput>({
    name: client?.name ?? defaultName,
    documentId: client?.documentId ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
    isActive: client?.isActive ?? true,
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validate(clientSchema, values);
    // La cédula es obligatoria (identifica al cliente; en Ecuador se comprueba el dígito verificador).
    const documentError = !result.success
      ? null
      : !result.data.documentId
        ? "La cédula es obligatoria."
        : business
          ? documentIdError(result.data.documentId, business.timezone)
          : null;
    // El email también es obligatorio: es por donde el cliente recibe sus citas y recordatorios.
    const emailError = result.success && !result.data.email ? "El email es obligatorio" : null;
    setErrors({
      ...result.errors,
      ...(documentError ? { documentId: documentError } : {}),
      ...(emailError ? { email: emailError } : {}),
    });
    if (!result.success || documentError || emailError) return;

    try {
      const saved = await saveClient.mutateAsync({ id: client?.id, input: result.data });
      toast.success(client ? "Cliente actualizado" : "Cliente creado");
      onSaved(saved);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <FormField label="Nombre completo" error={errors.name}>
        {(field) => (
          <Input {...field} autoFocus value={values.name} onChange={(e) => set("name", e.target.value)} />
        )}
      </FormField>
      <FormField
        label="Cédula"
        error={errors.documentId}
        hint="Sólo números, sin guiones. Identifica al cliente: con ella, sus reservas online se unen a esta ficha."
      >
        {(field) => (
          <Input
            {...field}
            inputMode="numeric"
            autoComplete="off"
            maxLength={business ? documentIdMaxLength(business.timezone) : 20}
            className="sm:w-56"
            value={values.documentId}
            onChange={(e) => set("documentId", onlyDigits(e.target.value))}
          />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Teléfono" error={errors.phone} optional>
          {(field) => (
            <Input
              {...field}
              type="tel"
              placeholder="+593 99 123 4567"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Email" error={errors.email}>
          {(field) => (
            <Input {...field} type="email" value={values.email} onChange={(e) => set("email", e.target.value)} />
          )}
        </FormField>
      </div>
      <FormField label="Dirección" error={errors.address} optional>
        {(field) => (
          <Input {...field} autoComplete="street-address" value={values.address} onChange={(e) => set("address", e.target.value)} />
        )}
      </FormField>
      <FormField label="Notas" error={errors.notes} optional hint="Sólo visibles para tu equipo.">
        {(field) => (
          <Textarea {...field} rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        )}
      </FormField>
      <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span>
          <span className="block text-sm font-medium">Cliente activo</span>
          <span className="block text-xs text-muted-foreground">Los inactivos no aparecen al crear citas.</span>
        </span>
        <Switch checked={values.isActive} onCheckedChange={(checked) => set("isActive", checked)} />
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <SubmitButton loading={saveClient.isPending}>{client ? "Guardar cambios" : "Crear cliente"}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
