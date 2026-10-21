import { FileText, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/use-session";
import { isBillingUnavailable, openSignedUrl, useBusinessBilling } from "@/hooks/queries/use-billing";
import { describeBillingDiscount, formatUsdAmount } from "@/lib/constants/business";
import { data, getErrorMessage } from "@/lib/data";
import { capitalize, formatDate } from "@/lib/format";
import type { BillingCharge, BusinessBilling } from "@/types";
import { BillingStatusBadge } from "./billing-status-badge";

/**
 * «Tu mensualidad» (spec 029), en Configuración → Negocio: el monto, el próximo día de pago y el historial
 * de sus pagos con su estado (y el motivo de un rechazo o de una anulación), con su comprobante. Un cobro
 * pendiente sólo se avisa: el propietario lo paga en la pantalla de pago, que mientras tanto tapa el panel.
 * Sólo el propietario (y el super admin en modo soporte, que sólo la ve): nunca la lista de planes ni los
 * precios de otros (principio III).
 */
export function MonthlyFeeCard() {
  const { session } = useSession();
  const isOwner = session?.role === "owner";
  const billing = useBusinessBilling(isOwner);

  if (!isOwner || isBillingUnavailable(billing.error)) return null;
  // Sin mensualidad ni cobros (el plan gratis, un negocio de cortesía), la tarjeta no ocupa lugar.
  if (billing.data && billing.data.monthlyFee === 0 && billing.data.charges.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={WalletCards} /> Tu mensualidad
        </CardTitle>
        <CardDescription>Lo que pagas cada mes por usar tu agenda, por transferencia. Sólo la ves tú.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {billing.isPending ? (
          <div className="grid gap-3" role="status" aria-label="Cargando">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        ) : billing.isError || !billing.data ? (
          <ErrorState onRetry={() => billing.refetch()} />
        ) : (
          <FeeDetails billing={billing.data} support={Boolean(session?.support)} />
        )}
      </CardContent>
    </Card>
  );
}

function FeeDetails({ billing, support }: { billing: BusinessBilling; support: boolean }) {
  const { pending } = billing;
  return (
    <>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Mensualidad</dt>
          <dd className="mt-0.5 text-2xl font-extrabold tabular-nums">{billing.monthlyFee > 0 ? formatUsdAmount(billing.monthlyFee) : "Sin mensualidad"}</dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">Próximo pago</dt>
          <dd className="mt-0.5 text-lg font-bold">{billing.nextDueDate ? capitalize(formatDate(billing.nextDueDate, "d 'de' MMMM")) : "—"}</dd>
          {billing.billingDay !== null && billing.monthlyFee > 0 && (
            <dd className="text-xs text-muted-foreground">El {billing.billingDay} de cada mes (o el último día, si el mes es más corto)</dd>
          )}
        </div>
      </dl>

      {pending && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-600/25 bg-amber-50 p-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
          <p className="text-sm">
            <span className="block font-semibold">
              Tu mensualidad de {formatDate(pending.dueDate, "MMMM")}: {formatUsdAmount(pending.amount)}
            </span>
            {pending.status === "rejected"
              ? `No pudimos confirmar el pago: ${pending.rejectionReason ?? "vuelve a subir el comprobante"}.`
              : `Día de pago: ${formatDate(pending.dueDate, "d 'de' MMMM")}. Falta el comprobante de la transferencia.`}
          </p>
          {support && <p className="text-xs">Al entrar al panel, el propietario tiene que subirlo para seguir usándolo.</p>}
        </div>
      )}

      <div className="grid gap-2">
        <p className="text-sm font-semibold">Tus pagos</p>
        {billing.charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no tienes cobros: el primero llega en tu día de pago.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {billing.charges.map((charge) => (
              <ChargeRow key={charge.id} charge={charge} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Un mes del historial: el monto (con su descuento), el estado, el motivo y el comprobante. */
function ChargeRow({ charge }: { charge: BillingCharge }) {
  const businessId = useSession().session?.businessId ?? "";
  const discount = describeBillingDiscount(charge);
  const reason = charge.status === "rejected" ? charge.rejectionReason : charge.status === "void" ? charge.voidReason : null;
  const openReceipt = () =>
    openSignedUrl(() => data.billing.getReceiptUrl(businessId, charge.id)).catch((error: unknown) => toast.error(getErrorMessage(error)));

  return (
    <li className="grid gap-1 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 text-sm font-medium">{capitalize(formatDate(charge.dueDate, "MMMM 'de' yyyy"))}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{formatUsdAmount(charge.amount)}</span>
          <BillingStatusBadge status={charge.status} />
        </div>
      </div>
      {discount && <p className="text-xs text-muted-foreground">{discount}</p>}
      {reason && <p className="text-xs text-muted-foreground">Motivo: {reason}</p>}
      {charge.receipt && (
        <Button type="button" variant="link" size="sm" className="h-auto justify-self-start p-0 text-xs" onClick={openReceipt}>
          <FileText aria-hidden /> Ver comprobante
        </Button>
      )}
    </li>
  );
}
