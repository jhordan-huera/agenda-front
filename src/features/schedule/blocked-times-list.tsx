import { CalendarOff, Clock, Palmtree, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useAgendas } from "@/features/professionals/use-agendas";
import { useDeleteBlockedTime } from "@/hooks/queries/use-schedule";
import { getErrorMessage } from "@/lib/data";
import type { BlockedTime } from "@/types";
import { describeBlockedTime } from "./schedule-utils";

export function BlockedTimesList({ blockedTimes }: { blockedTimes: BlockedTime[] }) {
  const deleteBlockedTime = useDeleteBlockedTime();
  const agendas = useAgendas();
  // Con varias agendas se dice de quién es cada bloqueo; el rol Profesional no quita los de todo el negocio.
  const scopeLabel = (block: BlockedTime) =>
    block.professionalId ? (agendas.byId(block.professionalId)?.displayName ?? "Profesional") : "Todo el negocio";
  const [deleting, setDeleting] = useState<BlockedTime | null>(null);

  if (blockedTimes.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-8 text-center">
        <CalendarOff className="size-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm font-medium">No tienes bloqueos próximos</p>
        <p className="text-xs text-muted-foreground">Bloquea vacaciones o franjas en las que no atenderás.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-lg border">
        {blockedTimes.map((block) => {
          const Icon = block.allDay ? Palmtree : Clock;
          return (
            <li key={block.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{block.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {describeBlockedTime(block)}
                  {(agendas.multiple || agendas.scoped) && ` · ${scopeLabel(block)}`}
                </p>
              </div>
              {!(agendas.scoped && block.professionalId === null) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar bloqueo ${block.reason}`}
                  onClick={() => setDeleting(block)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este bloqueo?"
        description="Ese horario volverá a estar disponible para reservas."
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteBlockedTime.mutateAsync(deleting.id);
            toast.success("Bloqueo eliminado");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </>
  );
}
