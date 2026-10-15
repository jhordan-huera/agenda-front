import { ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/features/auth/use-permissions";
import { useConfirmClaim } from "@/hooks/queries/use-clients";
import { useLookups } from "@/hooks/queries/use-lookups";
import { useErrorToast } from "@/hooks/use-error-toast";
import type { Client } from "@/types";

/**
 * Aviso de un paciente «Por verificar» (spec 009): reservó online con la cédula de otra ficha, pero con
 * otro email y otro teléfono. La reserva quedó aparte y nada llega a esa ficha hasta que el negocio la
 * revisa: si es la misma persona, la une a su ficha; si no, cancela la cita. El rol Profesional no la
 * une (se daría acceso a la ficha sin que recepción lo confirme). Si quien mira no puede ver la ficha
 * de esa cédula, el aviso no la nombra.
 */
export function ClaimReview({ patient, onMerged }: { patient: Client; /** Tras unirlo (el paciente aparte ya no existe). */ onMerged?: (claimed: Client) => void }) {
  const { clientsById } = useLookups();
  const { role, can } = usePermissions();
  const [open, setOpen] = useState(false);
  if (!patient.claimedClientId) return null;
  const claimed = clientsById.get(patient.claimedClientId);
  const canMerge = role !== "professional" && can("clients.manage");
  return (
    <div role="note" className="space-y-2 rounded-lg border border-amber-600/20 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="flex items-center gap-1.5 font-semibold">
        <ShieldQuestion className="size-4 shrink-0" aria-hidden /> Por verificar
      </p>
      <p>
        {claimed
          ? `La cédula es de ${claimed.name}, pero el email y el teléfono no coinciden con su ficha.`
          : "La cédula es de otro paciente del negocio, pero el email y el teléfono no coinciden con su ficha."}{" "}
        La reserva quedó aparte: no le llega nada a esa ficha hasta que se revise.
      </p>
      {canMerge ? (
        <>
          <Button type="button" size="sm" variant="outline" className="bg-background" onClick={() => setOpen(true)}>
            Es el mismo paciente: unir a su ficha
          </Button>
          <p className="text-xs">Si no es la misma persona, cancela la cita.</p>
          <ConfirmClaimDialog patient={patient} claimed={claimed} open={open} onOpenChange={setOpen} onMerged={onMerged} />
        </>
      ) : (
        <p className="text-xs">Lo revisa recepción o el propietario.</p>
      )}
    </div>
  );
}

function ConfirmClaimDialog({
  patient,
  claimed,
  open,
  onOpenChange,
  onMerged,
}: {
  patient: Client;
  claimed: Client | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged?: (claimed: Client) => void;
}) {
  const confirmClaim = useConfirmClaim();
  const showError = useErrorToast();
  const [updateEmail, setUpdateEmail] = useState(false);
  const [updatePhone, setUpdatePhone] = useState(false);
  const claimedName = claimed?.name ?? "el paciente";
  const offerEmail = patient.email !== "" && patient.email.toLowerCase() !== (claimed?.email ?? "").toLowerCase();
  const offerPhone = patient.phone !== "" && patient.phone !== (claimed?.phone ?? "");

  const submit = async () => {
    try {
      const merged = await confirmClaim.mutateAsync({
        clientId: patient.id,
        input: { updateEmail: offerEmail && updateEmail, updatePhone: offerPhone && updatePhone },
      });
      toast.success(`Reserva unida a la ficha de ${merged.name}`);
      onOpenChange(false);
      onMerged?.(merged);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unir a la ficha de {claimedName}</DialogTitle>
          <DialogDescription>
            Sus citas pasan a esa ficha y este paciente aparte desaparece. Hazlo sólo si confirmaste que es la misma persona
            (por ejemplo, llamándola).
          </DialogDescription>
        </DialogHeader>
        {(offerEmail || offerPhone) && (
          <div className="grid gap-3 text-sm">
            {offerEmail && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="claim-update-email"
                  checked={updateEmail}
                  onCheckedChange={(checked) => setUpdateEmail(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="claim-update-email" className="font-normal leading-snug">
                  Cambiar el email de la ficha a {patient.email}
                </Label>
              </div>
            )}
            {offerPhone && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="claim-update-phone"
                  checked={updatePhone}
                  onCheckedChange={(checked) => setUpdatePhone(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="claim-update-phone" className="font-normal leading-snug">
                  Cambiar el teléfono de la ficha a {patient.phone}
                </Label>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={confirmClaim.isPending}>
            Unir a la ficha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
