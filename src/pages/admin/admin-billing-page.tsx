import { Ban, Check, FileText, HandCoins, WalletCards, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { PageTitle } from "@/components/shared/page-title";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FilterChips } from "@/features/admin/filter-chips";
import { BillingStatusBadge } from "@/features/billing/billing-status-badge";
import {
  useAdminBilling,
  useApproveBillingCharge,
  useMarkBillingChargePaid,
  useRejectBillingCharge,
  useVoidBillingCharge,
} from "@/hooks/queries/use-admin";
import { openSignedUrl } from "@/hooks/queries/use-billing";
import { describeBillingDiscount, formatUsdAmount } from "@/lib/constants/business";
import { data, getErrorMessage } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";
import type { AdminBillingCharge, AdminBillingFilter } from "@/types";

/** Los filtros, en este orden, con su nombre y su dirección (`?estado=`, para volver atrás o compartirla). */
const FILTERS: { value: AdminBillingFilter; label: string; slug: string; empty: string }[] = [
  { value: "in_review", label: "En revisión", slug: "en-revision", empty: "No hay comprobantes por revisar." },
  { value: "due", label: "Por pagar", slug: "por-pagar", empty: "Ningún cobro por pagar dentro de sus días de gracia." },
  { value: "overdue", label: "Atrasados", slug: "atrasados", empty: "Ningún cobro atrasado." },
  { value: "paid", label: "Pagados", slug: "pagados", empty: "Todavía no hay cobros pagados." },
  { value: "rejected", label: "Rechazados", slug: "rechazados", empty: "Ningún comprobante rechazado." },
  { value: "void", label: "Anulados", slug: "anulados", empty: "Ningún cobro anulado." },
];

/** Lo que espera cada diálogo: el cobro y qué hacer con él. */
type Action = { kind: "approve" | "reject" | "paid" | "void"; charge: AdminBillingCharge };

/**
 * «Cobros» de /admin (spec 029): los cobros de las mensualidades de todos los negocios, por estado. En cada
 * uno, el negocio, el mes, el monto (con su descuento de referidos) y la fecha; los en revisión, con su
 * comprobante y «Pagado» o «Rechazar» (con el motivo); los por pagar o rechazados, «Pagado sin comprobante»;
 * y los pendientes, «Anular». Cada cambio le llega al propietario por email y queda en la actividad.
 */
export default function AdminBillingPage() {
  const [params, setParams] = useSearchParams();
  const filter = FILTERS.find((option) => option.slug === params.get("estado"))?.value ?? "in_review";
  const list = useAdminBilling(filter);
  // El cobro elegido se conserva al cerrar para que el texto del diálogo no cambie durante la animación.
  const [action, setAction] = useState<{ open: boolean; action: Action | null }>({ open: false, action: null });
  const current = FILTERS.find((option) => option.value === filter)!;

  const changeFilter = (value: AdminBillingFilter) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("estado", FILTERS.find((option) => option.value === value)!.slug);
        return next;
      },
      { replace: true },
    );
  const open = (kind: Action["kind"], charge: AdminBillingCharge) => setAction({ open: true, action: { kind, charge } });
  const close = () => setAction((previous) => ({ ...previous, open: false }));

  return (
    <div className="space-y-6">
      <PageTitle title="Cobros" />
      <PageHeader
        title="Cobros"
        description="Las mensualidades de los negocios: revisa los comprobantes y mira quién pagó, quién está por pagar y quién está atrasado."
      />

      <FilterChips
        label="Estado de los cobros"
        value={filter}
        onChange={changeFilter}
        options={FILTERS.map((option) => ({ value: option.value, label: option.label, count: list.data?.counts[option.value] ?? 0 }))}
      />

      {list.isError ? (
        <ErrorState onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <div className="grid gap-3" role="status" aria-label="Cargando">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : list.data.charges.length === 0 ? (
        <EmptyState icon={WalletCards} title={current.empty} description="Cuando un negocio llegue a su día de pago, su cobro aparece aquí." />
      ) : (
        <ul className="grid gap-3" aria-label={current.label}>
          {list.data.charges.map((charge) => (
            <ChargeCard key={charge.id} charge={charge} onAction={open} />
          ))}
        </ul>
      )}

      <ApproveDialog action={action.action?.kind === "approve" ? action.action : null} open={action.open} onClose={close} />
      <ReasonDialog
        action={action.action?.kind === "reject" || action.action?.kind === "void" ? action.action : null}
        open={action.open}
        onClose={close}
      />
      <PaidDialog action={action.action?.kind === "paid" ? action.action : null} open={action.open} onClose={close} />
    </div>
  );
}

/** «Mensualidad de noviembre de 2026» */
const monthOf = (charge: AdminBillingCharge) => `Mensualidad de ${formatDate(charge.dueDate, "MMMM 'de' yyyy")}`;

/** «Día de pago: 14 nov 2026 · le quedan 3 días de gracia»: cuándo vence y, si espera el comprobante, cuánto le queda. */
function dueLabel(charge: AdminBillingCharge): string {
  const date = `Día de pago: ${formatDate(charge.dueDate, "d MMM yyyy")}`;
  if (charge.status !== "due" && charge.status !== "rejected") return date;
  if (charge.graceDaysLeft === 0) return `${date} · pasaron los días de gracia`;
  return `${date} · ${charge.graceDaysLeft === 1 ? "le queda 1 día" : `le quedan ${charge.graceDaysLeft} días`} de gracia`;
}

function ChargeCard({ charge, onAction }: { charge: AdminBillingCharge; onAction: (kind: Action["kind"], charge: AdminBillingCharge) => void }) {
  const discount = describeBillingDiscount(charge);
  const awaiting = charge.status === "due" || charge.status === "rejected";
  const openReceipt = () =>
    openSignedUrl(() => data.admin.getBillingReceiptUrl(charge.id)).catch((error: unknown) => toast.error(getErrorMessage(error)));

  return (
    <li>
      <Card className="gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <Link to={`/admin/businesses/${charge.business.id}`} className="font-semibold [overflow-wrap:anywhere] hover:underline">
              {charge.business.name}
            </Link>
            <p className="text-sm text-muted-foreground">{monthOf(charge)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tabular-nums">{formatUsdAmount(charge.amount)}</span>
            <BillingStatusBadge status={charge.status} overdue={charge.graceDaysLeft === 0} />
          </div>
        </div>
        <div className="grid gap-0.5 text-xs text-muted-foreground">
          <p>{dueLabel(charge)}</p>
          {discount && <p>{discount}</p>}
          {charge.receipt && <p>Comprobante: {formatDateTime(charge.receipt.createdAt)}</p>}
          {charge.rejectionReason && (charge.status === "rejected" || charge.status === "in_review") && (
            <p>
              {charge.status === "rejected" ? "Motivo del rechazo" : "Lo rechazaste antes"}: {charge.rejectionReason}
            </p>
          )}
          {charge.status === "void" && charge.voidReason && <p>Motivo de la anulación: {charge.voidReason}</p>}
          {charge.status === "paid" && (
            <p>
              {charge.paidMethod === "other" ? "Pagado sin comprobante" : "Pagado por transferencia"}
              {charge.paidAt && ` el ${formatDateTime(charge.paidAt)}`}
              {charge.paidNote && `: ${charge.paidNote}`}
            </p>
          )}
          {charge.reviewedByName && charge.status !== "in_review" && charge.status !== "due" && <p>Por {charge.reviewedByName}</p>}
        </div>
        {(charge.receipt || charge.status === "in_review" || awaiting) && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {charge.receipt && (
              <Button size="sm" variant="outline" onClick={openReceipt}>
                <FileText aria-hidden /> Ver comprobante
              </Button>
            )}
            {charge.status === "in_review" && (
              <>
                <Button size="sm" onClick={() => onAction("approve", charge)}>
                  <Check aria-hidden /> Pagado
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAction("reject", charge)}>
                  <X aria-hidden /> Rechazar
                </Button>
              </>
            )}
            {awaiting && (
              <Button size="sm" variant="outline" onClick={() => onAction("paid", charge)}>
                <HandCoins aria-hidden /> Pagado sin comprobante
              </Button>
            )}
            {(awaiting || charge.status === "in_review") && (
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onAction("void", charge)}>
                <Ban aria-hidden /> Anular
              </Button>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}

/** «Pagado»: se confirma aquí mismo (dos toques, CE-002). */
function ApproveDialog({ action, open, onClose }: { action: Action | null; open: boolean; onClose: () => void }) {
  const approve = useApproveBillingCharge();
  const charge = action?.charge;
  return (
    <ConfirmDialog
      open={open && Boolean(charge)}
      onOpenChange={(next) => !next && onClose()}
      title={charge ? `¿Confirmar el pago de ${charge.business.name}?` : ""}
      description={
        charge
          ? `${monthOf(charge)}: ${formatUsdAmount(charge.amount)}. Le avisamos por email y sus descuentos de referidos quedan aplicados.`
          : ""
      }
      confirmLabel="Pagado"
      onConfirm={async () => {
        if (!charge) return;
        try {
          await approve.mutateAsync(charge.id);
          toast.success(`Pago de ${charge.business.name} confirmado`);
        } catch (error) {
          toast.error(getErrorMessage(error));
          throw error;
        }
      }}
    />
  );
}

/** «Rechazar» o «Anular», con el motivo: le llega al propietario por email. */
function ReasonDialog({ action, open, onClose }: { action: Action | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open && Boolean(action)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">{action && <ReasonForm key={`${action.kind}-${action.charge.id}`} action={action} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function ReasonForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const reject = useRejectBillingCharge();
  const voidCharge = useVoidBillingCharge();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const rejecting = action.kind === "reject";
  const { charge } = action;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 3) {
      setError("Escribe el motivo");
      return;
    }
    try {
      await (rejecting ? reject : voidCharge).mutateAsync({ chargeId: charge.id, reason: reason.trim() });
      toast.success(rejecting ? "Comprobante rechazado. Le avisamos al propietario por email." : "Cobro anulado. Le avisamos al propietario por email.");
      onDone();
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {rejecting ? "Rechazar el comprobante" : "Anular el cobro"} de {charge.business.name}
        </DialogTitle>
        <DialogDescription>
          {monthOf(charge)}: {formatUsdAmount(charge.amount)}.{" "}
          {rejecting
            ? "Al entrar, se le vuelve a abrir la pantalla de pago con los días de gracia que le queden."
            : "Ya no se le cobra; si usaba descuentos de referidos, vuelven a quedar para el cobro siguiente."}
        </DialogDescription>
      </DialogHeader>
      <FormField
        label="Motivo"
        error={error}
        hint={rejecting ? "Lo verá el propietario: «No llegó la transferencia», «El monto no coincide»…" : "Lo verá el propietario en el email."}
      >
        {(field) => (
          <Textarea
            {...field}
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError(undefined);
            }}
          />
        )}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton variant="destructive" loading={reject.isPending || voidCharge.isPending}>
          {rejecting ? "Rechazar" : "Anular el cobro"}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** «Pagado sin comprobante»: el pago llegó por otra vía; la nota (opcional) sólo la ves tú. */
function PaidDialog({ action, open, onClose }: { action: Action | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open && Boolean(action)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">{action && <PaidForm key={action.charge.id} action={action} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function PaidForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const markPaid = useMarkBillingChargePaid();
  const [note, setNote] = useState("");
  const { charge } = action;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await markPaid.mutateAsync({ chargeId: charge.id, input: { note: note.trim() } });
      toast.success(`Pago de ${charge.business.name} confirmado`);
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Pagado sin comprobante: {charge.business.name}</DialogTitle>
        <DialogDescription>
          {monthOf(charge)}: {formatUsdAmount(charge.amount)}. Le avisamos por email y sus descuentos de referidos quedan aplicados.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Cómo pagó" optional hint="Sólo la ves tú: «Efectivo», «Depósito en ventanilla»…">
        {(field) => <Textarea {...field} rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton loading={markPaid.isPending}>Marcar pagado</SubmitButton>
      </DialogFooter>
    </form>
  );
}
