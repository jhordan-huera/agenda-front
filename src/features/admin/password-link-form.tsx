import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSendPasswordLink } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import type { PasswordLink } from "@/types";
import { PasswordLinkPanel } from "./password-link-panel";

export interface PasswordTarget {
  id: string;
  name: string;
  email: string;
}

/**
 * Diálogo "Enviar enlace para definir contraseña" (ver usePasswordLinkDialog): el super admin no elige
 * ni ve la contraseña; el usuario recibe un enlace de un solo uso y la define él.
 */
export function PasswordLinkForm({ target, onDone }: { target: PasswordTarget; onDone: () => void }) {
  const sendLink = useSendPasswordLink();
  const [link, setLink] = useState<PasswordLink | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setLink(await sendLink.mutateAsync(target.id));
      toast.success(`Enlace enviado a ${target.email}`);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
    }
  };

  if (link) {
    return (
      <div className="grid gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden /> Enlace enviado
          </DialogTitle>
          <DialogDescription>
            Cuando {target.name} defina su contraseña se cerrarán sus sesiones abiertas.
          </DialogDescription>
        </DialogHeader>
        <PasswordLinkPanel link={link} firstName={target.name.split(" ")[0]} />
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            Listo
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-5 text-primary" aria-hidden /> Enviar enlace para definir contraseña
        </DialogTitle>
        <DialogDescription>
          {target.name} recibirá en {target.email} un enlace de un solo uso (caduca en 60 minutos) para elegir una
          contraseña nueva. Nadie más la verá. Hasta que la defina, la actual sigue sirviendo.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={sendLink.isPending} loadingText="Enviando…">
          Enviar enlace
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
