import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SetPasswordForm, type PasswordTarget } from "./set-password-form";

/**
 * Cambiar la contraseña de un usuario (soporte): el super admin la escribe, se le envía por
 * email y se cierran sus sesiones abiertas. Devuelve la acción para abrirlo y el JSX del diálogo.
 */
export function useSetPasswordDialog() {
  const [target, setTarget] = useState<PasswordTarget | null>(null);
  const [open, setOpen] = useState(false);

  const request = (user: PasswordTarget) => {
    setTarget(user);
    setOpen(true);
  };

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        {/* Se monta de nuevo en cada apertura: el campo empieza vacío. */}
        {open && target && <SetPasswordForm target={target} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );

  return { request, dialog };
}
