import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSetUserPassword } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { userPasswordSchema } from "@/lib/validations/admin";
import { validate } from "@/lib/validations/validate";

export interface PasswordTarget {
  id: string;
  name: string;
  email: string;
}

/** Formulario del diálogo "Cambiar contraseña" (ver useSetPasswordDialog). */
export function SetPasswordForm({ target, onDone }: { target: PasswordTarget; onDone: () => void }) {
  const setPassword = useSetUserPassword();
  const [password, setPasswordValue] = useState("");
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate(userPasswordSchema, { password });
    setError(validation.errors.password);
    if (!validation.success) return;
    try {
      await setPassword.mutateAsync({ userId: target.id, password: validation.data.password });
      toast.success(`Contraseña cambiada. Se la enviamos a ${target.email}`);
      onDone();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden /> Cambiar la contraseña de {target.name}
        </DialogTitle>
        <DialogDescription>
          Se la enviaremos por email a {target.email} y se cerrarán sus sesiones abiertas.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Nueva contraseña" error={error} hint="Mínimo 8 caracteres. Apúntala: el usuario no puede cambiarla.">
        {(field) => (
          <Input
            {...field}
            autoFocus
            autoComplete="off"
            className="font-mono"
            value={password}
            onChange={(e) => setPasswordValue(e.target.value)}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={setPassword.isPending} loadingText="Guardando…">
          Cambiar contraseña
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
