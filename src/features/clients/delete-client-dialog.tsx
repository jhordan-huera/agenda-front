import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDeleteClient } from "@/hooks/queries/use-clients";
import { getErrorMessage } from "@/lib/data";
import type { Client } from "@/types";

interface DeleteClientDialogProps {
  client: Client | null;
  appointmentCount: number;
  onOpenChange: (open: boolean) => void;
  /** Ruta a la que volver tras eliminar (p. ej. desde la ficha del cliente). */
  redirectTo?: string;
}

export function DeleteClientDialog({ client, appointmentCount, onOpenChange, redirectTo }: DeleteClientDialogProps) {
  const deleteClient = useDeleteClient();
  const navigate = useNavigate();

  return (
    <ConfirmDialog
      open={Boolean(client)}
      onOpenChange={onOpenChange}
      title={`¿Eliminar a ${client?.name ?? "este cliente"}?`}
      description={
        appointmentCount > 0
          ? `También se eliminará su historial de ${appointmentCount} cita${appointmentCount === 1 ? "" : "s"}. Esta acción no se puede deshacer. Si sólo quieres ocultarlo, márcalo como inactivo.`
          : "Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar"
      destructive
      onConfirm={async () => {
        if (!client) return;
        try {
          await deleteClient.mutateAsync(client.id);
          toast.success("Cliente eliminado");
          if (redirectTo) navigate(redirectTo, { replace: true });
        } catch (error) {
          toast.error(getErrorMessage(error));
          throw error;
        }
      }}
    />
  );
}
