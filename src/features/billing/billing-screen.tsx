import { CircleAlert, Landmark, LogOut, WalletCards } from "lucide-react";
import { useSignOut } from "@/components/layout/use-sign-out";
import { Logo } from "@/components/shared/logo";
import { PageTitle } from "@/components/shared/page-title";
import { SupportContact } from "@/components/shared/support-contact";
import { Button } from "@/components/ui/button";
import { ReceiptUploadButton, TransferAccounts } from "@/features/payments/bank-transfer-card";
import { usePlatformSettings } from "@/hooks/queries/use-admin";
import { useUploadBillingReceipt } from "@/hooks/queries/use-billing";
import { APP_NAME } from "@/lib/constants/app";
import { BILLING_GRACE_DAYS, describeBillingDiscount, formatUsdAmount } from "@/lib/constants/business";
import { formatDate } from "@/lib/format";
import type { BillingCharge, BusinessBilling } from "@/types";

interface BillingScreenProps {
  billing: BusinessBilling & { pending: BillingCharge };
  /** «Más tarde»: sólo dentro de los días de gracia. */
  onLater: () => void;
  /** Subió el comprobante: el panel se abre (la mensualidad ya se está recargando). */
  onSent: () => void;
}

/** «Te queda 1 día» / «Te quedan 5 días». */
const daysLeft = (days: number) => (days === 1 ? "Te queda 1 día" : `Te quedan ${days} días`);

/**
 * «Tu mensualidad de noviembre» (spec 029): la ve el propietario, en lugar del panel, desde el día de pago
 * de un cobro sin comprobante (el más antiguo, si hay varios). El monto (con el descuento de referidos), las
 * cuentas para transferir con «Copiar», «Subir comprobante» y, durante los 5 días de gracia, «Más tarde».
 * Pasada la gracia, la pantalla no se cierra hasta subirlo: sólo queda «Cerrar sesión». Si el super admin
 * rechazó el comprobante, dice el motivo. Nunca en modo soporte ni para el resto del equipo: su equipo y su
 * página de reservas siguen funcionando.
 */
export function BillingScreen({ billing, onLater, onSent }: BillingScreenProps) {
  const signOut = useSignOut();
  const { pending, graceDaysLeft, blocked, bankAccounts, receiptsEnabled } = billing;
  const upload = useUploadBillingReceipt(pending.id);
  const { data: settings } = usePlatformSettings();
  const month = formatDate(pending.dueDate, "MMMM");
  const discount = describeBillingDiscount(pending);
  const rejected = pending.status === "rejected";
  const supportMessage = `Hola, tengo una consulta sobre mi mensualidad de ${month} en ${APP_NAME}.`;

  return (
    <div className="min-h-screen bg-canvas px-4 py-5 sm:px-6 sm:py-8">
      <PageTitle title={`Tu mensualidad de ${month}`} />
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Logo href="/dashboard" />
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={signOut}>
            <LogOut /> Cerrar sesión
          </Button>
        </div>
        <main className="rounded-2xl border bg-background p-4 shadow-[0_8px_30px_-16px_rgb(16_24_40/0.18)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-highlight text-lilac-ink">
              <WalletCards className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-balance">Tu mensualidad de {month}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {blocked
                  ? `Pasaron los ${BILLING_GRACE_DAYS} días para enviar el comprobante: súbelo para seguir usando el panel. Tu equipo y tu página de reservas siguen funcionando.`
                  : `${graceDaysLeft >= BILLING_GRACE_DAYS ? "Vence hoy" : `Venció el ${formatDate(pending.dueDate, "d 'de' MMMM")}`}. Transfiere a ${
                      bankAccounts.length > 1 ? "cualquiera de estas cuentas" : "esta cuenta"
                    } y sube el comprobante: lo revisamos y te avisamos por email.`}
              </p>
            </div>
          </div>

          {rejected && pending.rejectionReason && (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-lg border border-amber-600/25 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">No pudimos confirmar tu pago:</span> {pending.rejectionReason.replace(/[.\s]+$/, "")}. Revisa la transferencia y vuelve a subir el
                comprobante.
              </span>
            </p>
          )}

          <div className="mt-5 rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Total a pagar</p>
            <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">{formatUsdAmount(pending.amount)}</p>
            {discount && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {discount} = {formatUsdAmount(pending.amount)}
              </p>
            )}
          </div>

          <section aria-labelledby="billing-accounts-title" className="mt-5">
            <h2 id="billing-accounts-title" className="flex items-center gap-2 text-base font-bold">
              <Landmark className="size-4 text-primary" aria-hidden />
              {bankAccounts.length > 1 ? "Transfiere a cualquiera de estas cuentas" : "Cuenta para transferir"}
            </h2>
            {bankAccounts.length > 0 ? (
              <TransferAccounts bankAccounts={bankAccounts} amountRows={[{ label: "Monto", value: formatUsdAmount(pending.amount) }]} />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Pídenos los datos para transferir:{" "}
                {settings ? <SupportContact email={settings.supportEmail} phone={settings.supportPhone} message={supportMessage} /> : "escríbenos a soporte"}.
              </p>
            )}
          </section>

          <div className="mt-6 grid gap-3 border-t pt-4">
            {receiptsEnabled ? (
              <ReceiptUploadButton
                upload={upload}
                onSent={onSent}
                sentText="Lo revisamos y te avisamos por email. Ya puedes usar el panel."
                className="sm:justify-self-start"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Por ahora no se pueden subir comprobantes aquí: envíanoslo a{" "}
                {settings ? <SupportContact email={settings.supportEmail} phone={settings.supportPhone} message={supportMessage} /> : "soporte"}.
              </p>
            )}
            <p className="text-xs text-muted-foreground">Una foto o el PDF del banco, de hasta 10 MB. Sólo lo vemos tú y el equipo de {APP_NAME}.</p>
            {graceDaysLeft > 0 ? (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {daysLeft(graceDaysLeft)} para enviarlo. Con «Más tarde» entras al panel; esta pantalla vuelve a salir en tu siguiente inicio de sesión.
                </p>
                <Button variant="outline" className="shrink-0" onClick={onLater}>
                  Más tarde
                </Button>
              </div>
            ) : (
              settings && (
                <p className="text-xs text-muted-foreground">
                  ¿Ya pagaste o tienes una duda? Escríbenos a{" "}
                  <SupportContact email={settings.supportEmail} phone={settings.supportPhone} message={supportMessage} />.
                </p>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
