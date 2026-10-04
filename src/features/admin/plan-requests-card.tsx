import { ArrowRight, Check, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPlanRequests, useApprovePlanRequest, useRejectPlanRequest } from "@/hooks/queries/use-admin";
import { getPlan } from "@/lib/constants/plans";
import { getErrorMessage } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { AdminPlanRequest, PlanRequestStatus } from "@/types";

const STATUS_LABELS: Record<Exclude<PlanRequestStatus, "pending">, string> = {
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada por el negocio",
};

/**
 * Solicitudes de cambio de plan de los negocios: el super admin las aprueba (se aplica el
 * plan) o las rechaza, y el propietario recibe un email. Con `businessId`, sólo las de ese negocio.
 */
export function PlanRequestsCard({ businessId }: { businessId?: string }) {
  const requests = useAdminPlanRequests();
  const approve = useApprovePlanRequest();
  const [approving, setApproving] = useState<AdminPlanRequest | null>(null);
  const [rejecting, setRejecting] = useState<AdminPlanRequest | null>(null);

  const all = (requests.data ?? []).filter((request) => !businessId || request.businessId === businessId);
  const pending = all.filter((request) => request.status === "pending");
  const resolved = all.filter((request) => request.status !== "pending").slice(0, 5);

  // En la ficha de un negocio sólo aparece si hay algo pendiente.
  if (businessId && pending.length === 0) return null;

  return (
    <Card className={pending.length > 0 ? "ring-2 ring-amber-400" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Solicitudes de cambio de plan
          {pending.length > 0 && <Badge className="bg-amber-100 text-amber-900">{pending.length} pendiente(s)</Badge>}
        </CardTitle>
        <CardDescription>
          Los propietarios piden el cambio desde su suscripción. Al aprobarlo se aplica el plan y se les avisa por email.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {requests.isPending ? (
          <Skeleton className="h-20" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {pending.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {businessId ? (
                      request.businessName
                    ) : (
                      <Link to={`/admin/businesses/${request.businessId}`} className="hover:underline">
                        {request.businessName}
                      </Link>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {getPlan(request.currentPlan).name} <ArrowRight className="size-3" aria-label="a" />
                    <span className="font-medium text-foreground">
                      {getPlan(request.requestedPlan).name} ({formatCurrency(getPlan(request.requestedPlan).price)}/mes)
                    </span>
                    · {request.requestedByName} · {formatDateTime(request.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setRejecting(request)}>
                    <X /> Rechazar
                  </Button>
                  <Button size="sm" onClick={() => setApproving(request)}>
                    <Check /> Aprobar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!businessId && resolved.length > 0 && (
          <div className="grid gap-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Resueltas recientemente</p>
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {resolved.map((request) => (
                <li key={request.id}>
                  {request.businessName}: {getPlan(request.currentPlan).name} → {getPlan(request.requestedPlan).name} ·{" "}
                  {STATUS_LABELS[request.status as Exclude<PlanRequestStatus, "pending">]}
                  {request.rejectionReason && ` (${request.rejectionReason})`}
                  {request.resolvedAt && ` · ${formatDateTime(request.resolvedAt)}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(approving)}
        onOpenChange={(open) => !open && setApproving(null)}
        title={`¿Aprobar el plan ${approving ? getPlan(approving.requestedPlan).name : ""} para ${approving?.businessName ?? ""}?`}
        description="El plan se aplica de inmediato (sin cobro) y avisamos al propietario por email."
        confirmLabel="Aprobar"
        onConfirm={async () => {
          if (!approving) return;
          try {
            await approve.mutateAsync(approving.id);
            toast.success(`${approving.businessName} ya tiene el plan ${getPlan(approving.requestedPlan).name}`);
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
      <RejectDialog request={rejecting} onClose={() => setRejecting(null)} />
    </Card>
  );
}

function RejectDialog({ request, onClose }: { request: AdminPlanRequest | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">{request && <RejectForm request={request} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function RejectForm({ request, onDone }: { request: AdminPlanRequest; onDone: () => void }) {
  const reject = useRejectPlanRequest();
  const [reason, setReason] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await reject.mutateAsync({ requestId: request.id, reason: reason.trim() });
      toast.success("Solicitud rechazada. Avisamos al propietario por email.");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          Rechazar el plan {getPlan(request.requestedPlan).name} para {request.businessName}
        </DialogTitle>
        <DialogDescription>Su plan actual se mantiene. Le enviaremos un email con el motivo.</DialogDescription>
      </DialogHeader>
      <FormField label="Motivo" optional hint="Lo verá el propietario en el email.">
        {(field) => (
          <Textarea {...field} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton variant="destructive" loading={reject.isPending}>
          Rechazar solicitud
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
