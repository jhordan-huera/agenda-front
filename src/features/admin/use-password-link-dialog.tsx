import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PasswordLinkForm, type PasswordTarget } from "./password-link-form";

/**
 * "Enviar enlace para definir contraseña" (soporte): el usuario recibe por email un enlace de un solo
 * uso para elegir la suya, y el super admin puede copiarlo si el email no llega. Devuelve la acción
 * para abrirlo y el JSX del diálogo.
 */
export function usePasswordLinkDialog() {
  const [target, setTarget] = useState<PasswordTarget | null>(null);
  const [open, setOpen] = useState(false);

  const request = (user: PasswordTarget) => {
    setTarget(user);
    setOpen(true);
  };

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        {/* Se monta de nuevo en cada apertura: empieza en el paso de confirmar. */}
        {open && target && <PasswordLinkForm target={target} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );

  return { request, dialog };
}
