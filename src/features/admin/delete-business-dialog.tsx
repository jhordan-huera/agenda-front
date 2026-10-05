import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/auth/use-session";
import { useDeleteBusiness } from "@/hooks/queries/use-admin";
import { getErrorMessage } from "@/lib/data";
import { plural } from "@/lib/format";
import { isSameBusinessName } from "@/lib/validations/admin";

interface DeleteBusinessDialogProps {
  business: { id: string; name: string };
  /** Cuentas del equipo, que se eliminan con el negocio. */
  members: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Eliminar un negocio para siempre: hay que escribir su nombre para confirmar. */
export function DeleteBusinessDialog({ business, members, open, onOpenChange }: DeleteBusinessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Se monta de nuevo en cada apertura: el campo empieza vacío. */}
        {open && <DeleteBusinessForm business={business} members={members} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function DeleteBusinessForm({ business, members, onCancel }: Omit<DeleteBusinessDialogProps, "open" | "onOpenChange"> & { onCancel: () => void }) {
  const deleteBusiness = useDeleteBusiness();
  const { session, exitSupport } = useSession();
  const navigate = useNavigate();
  const [confirmName, setConfirmName] = useState("");
  const matches = isSameBusinessName(confirmName, business.name);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!matches) return;
    try {
      await deleteBusiness.mutateAsync({ businessId: business.id, confirmName });
      // Si lo estaba gestionando en modo soporte, ese modo ya no tiene negocio.
      if (session?.support && session.businessId === business.id) exitSupport();
      navigate("/admin/businesses", { replace: true });
      toast.success(`${business.name} se eliminó`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Trash2 className="size-5 text-destructive" aria-hidden /> Eliminar {business.name}
        </DialogTitle>
        <DialogDescription>Se borra para siempre y no se puede deshacer.</DialogDescription>
      </DialogHeader>
      <ul className="grid list-disc gap-1 rounded-lg border border-destructive/25 bg-destructive/5 py-3 pr-4 pl-8 text-sm">
        <li>Citas, clientes, servicios y horarios.</li>
        <li>Historias clínicas y sus archivos.</li>
        <li>
          {members === 1
            ? "La cuenta de su único usuario: no podrá volver a entrar."
            : `Las ${members > 1 ? plural(members, "cuenta", "cuentas") : "cuentas"} de su equipo: no podrán volver a entrar.`}
        </li>
        <li>Su página de reservas.</li>
      </ul>
      <p className="text-sm text-muted-foreground">¿Sólo quieres pausarlo? Suspéndelo: los datos se conservan.</p>
      <FormField label={`Escribe «${business.name}» para confirmar`}>
        {(field) => (
          <Input
            {...field}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={business.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={deleteBusiness.isPending}>
          Cancelar
        </Button>
        <SubmitButton variant="destructive" disabled={!matches} loading={deleteBusiness.isPending} loadingText="Eliminando…">
          Eliminar negocio
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
