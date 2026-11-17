import { Gift, KeyRound, Smartphone, Ticket, Unlink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/features/auth/use-permissions";
import { useClientLoyalty, usePatientResetLink, useUnlinkPatientAccount } from "@/hooks/queries/use-loyalty";
import { LOYALTY_LEVELS, PATIENT_RESET_HOURS, describeBenefit, formatRewardCode } from "@/lib/constants/loyalty";
import { getErrorMessage } from "@/lib/data";
import { cn } from "@/lib/utils";
import { buildPatientResetWhatsAppMessage, getWhatsAppUrl } from "@/lib/whatsapp";
import type { Business, Client, ClientLoyalty, LoyaltyMember, LoyaltyProgram, LoyaltyReward } from "@/types";
import { describeMissing, progressSlots, rewardDetail, sortRewards, stampsLabel } from "./loyalty-text";
import { RedeemRewardDialog } from "./redeem-reward-dialog";
import { RewardStatusBadge } from "./reward-status-badge";
import { StampIcon } from "./stamp-icon";

/** Si tiene cuenta de paciente: unida, creada con su teléfono y sin unir todavía, unida a otra ficha o ninguna. */
const ACCOUNT_TEXT: Record<ClientLoyalty["account"], string> = {
  linked: "Tiene su cuenta unida: ve su tarjeta y sus premios en su celular.",
  pending: "Creó su cuenta con este teléfono, pero todavía no está unida: escanea su QR («Escanear» en la Agenda) para unirla.",
  elsewhere: "Su teléfono tiene una cuenta, unida a otra ficha de tu consultorio (un teléfono compartido).",
  none: "Sin cuenta: suma igual. Si crea su cuenta en «Mi tarjeta», escanea su QR para unirla.",
};

/** Del historial (canjeadas, vencidas y anuladas) se ven éstas; el resto, con «Ver todo». */
const HISTORY_SHOWN = 3;

/**
 * «Tarjeta de fidelización» en la ficha del paciente (spec 052): sus sellos de la tarjeta actual, su nivel, el
 * próximo premio y cuánto le falta, si tiene cuenta unida y sus recompensas con su código. «Canjear», sólo quien puede
 * (propietario, administradores y Recepción); «Enlace para cambiar la contraseña», si tiene cuenta unida. Con la
 * tarjeta apagada y nada ganado, no sale.
 */
export function ClientLoyaltyCard({ client, business }: { client: Client; business: Business }) {
  const query = useClientLoyalty(client.id);
  const { can } = usePermissions();
  const [redeeming, setRedeeming] = useState<LoyaltyReward | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const resetLink = usePatientResetLink();
  const unlink = useUnlinkPatientAccount();
  const unlinkAccount = async () => {
    try {
      await unlink.mutateAsync(client.id);
      toast.success("Desunimos la cuenta de esta ficha.");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  };

  const loyalty = query.data;
  if (!loyalty) return null;
  const { program, card, rewards } = loyalty;
  if (!program.enabled && !card && rewards.length === 0) return null;

  const sorted = sortRewards(rewards);
  const available = sorted.filter((reward) => reward.status === "available");
  const history = sorted.filter((reward) => reward.status !== "available");
  const shownHistory = showAll ? history : history.slice(0, HISTORY_SHOWN);
  const canRedeem = can("loyalty.redeem");

  // La pestaña se abre antes de pedir el enlace: si no, el navegador la bloquea como ventana emergente.
  const sendResetLink = async () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const link = await resetLink.mutateAsync(client.id);
      const url = getWhatsAppUrl(
        link.phone,
        business.timezone,
        buildPatientResetWhatsAppMessage({ clientName: client.name, businessName: business.name, url: link.url, hours: PATIENT_RESET_HOURS }),
      );
      if (!url) throw new Error("Sin teléfono");
      if (tab) tab.location.href = url;
      else window.location.href = url;
      toast.success("Abrimos WhatsApp con el enlace", { description: `Sirve una sola vez y vence en ${PATIENT_RESET_HOURS} horas.` });
    } catch (error) {
      tab?.close();
      toast.error(getErrorMessage(error, "No pudimos abrir WhatsApp. Inténtalo de nuevo."));
      throw error;
    }
  };

  return (
    <Card aria-labelledby="client-loyalty-title">
      <CardHeader>
        <CardTitle id="client-loyalty-title">Tarjeta de fidelización</CardTitle>
        <CardDescription>
          {program.enabled
            ? `«${program.name}»: cada cita atendida suma un sello.`
            : "La tarjeta está apagada: no suma sellos. Lo ya ganado se puede canjear."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardProgress program={program} card={card} />

        <p className={cn("flex items-start gap-2 text-sm", loyalty.account === "pending" ? "text-foreground" : "text-muted-foreground")}>
          <Smartphone className={cn("mt-0.5 size-4 shrink-0", loyalty.account === "pending" && "text-primary")} aria-hidden />
          <span>{ACCOUNT_TEXT[loyalty.account]}</span>
        </p>

        {(available.length > 0 || history.length > 0) && (
          <section aria-label="Sus recompensas" className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Sus recompensas</h3>
            <ul className="divide-y">
              {[...available, ...shownHistory].map((reward) => (
                <li key={reward.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{reward.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {describeBenefit(reward.kind, reward.value, reward.serviceName, business.currency)} ·{" "}
                        <span className="font-mono text-foreground">{formatRewardCode(reward.code)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{rewardDetail(reward, business.timezone)}</p>
                    </div>
                    <RewardStatusBadge status={reward.status} />
                  </div>
                  {reward.status === "available" && canRedeem && (
                    <Button size="sm" variant="outline" className="self-start" onClick={() => setRedeeming(reward)}>
                      <Ticket /> Canjear
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {history.length > HISTORY_SHOWN && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>
                {showAll ? "Ver menos" : `Ver todo el historial (${history.length})`}
              </Button>
            )}
          </section>
        )}

        {loyalty.account === "linked" && can("clients.manage") && (
          <div className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              <KeyRound /> Enlace para cambiar la contraseña
            </Button>
            <p className="mt-1.5 text-xs text-muted-foreground">Si olvidó su contraseña: se lo envías por WhatsApp a su cuenta.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setConfirmUnlink(true)}>
              <Unlink /> Desunir la cuenta
            </Button>
          </div>
        )}
      </CardContent>

      <RedeemRewardDialog reward={redeeming} onOpenChange={(open) => !open && setRedeeming(null)} />
      <ConfirmDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title="¿Desunir la cuenta de esta ficha?"
        description="Si se unió a la ficha equivocada. La ficha conserva sus sellos y sus premios; la cuenta deja de ver esta tarjeta hasta que vuelvas a escanear su QR. Queda en la actividad."
        confirmLabel="Desunir la cuenta"
        destructive
        onConfirm={unlinkAccount}
      />
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="¿Enviarle un enlace para cambiar la contraseña?"
        description={`Abrimos WhatsApp hacia el teléfono de su cuenta con el mensaje ya escrito. El enlace sirve una sola vez y vence en ${PATIENT_RESET_HOURS} horas. Al entrar, verá que lo pidió ${business.name}. Queda en la actividad.`}
        confirmLabel="Abrir WhatsApp"
        onConfirm={sendResetLink}
      />
    </Card>
  );
}

/** Los sellos de la tarjeta actual, el nivel y el próximo premio. */
function CardProgress({ program, card }: { program: LoyaltyProgram; card: LoyaltyMember | null }) {
  const stamps = card?.stamps ?? 0;
  const next = card?.next ?? null;
  const slots = progressSlots(stamps, next);
  const showLevel = card && (program.afterLast === "restart" || card.level !== "classic");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p>
          <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums">{stamps}</span>{" "}
          <span className="text-sm text-muted-foreground">{stamps === 1 ? "sello" : "sellos"}</span>
        </p>
        {showLevel && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
            Nivel {LOYALTY_LEVELS[card.level]} · tarjeta {card.cardNumber}
          </span>
        )}
      </div>

      {slots ? (
        <div role="img" className="flex flex-wrap gap-1.5" aria-label={`${stampsLabel(slots.filled)} de ${slots.slots}`}>
          {Array.from({ length: slots.slots }, (_, index) => {
            const filled = index < slots.filled;
            const prize = next !== null && index === slots.slots - 1;
            return (
              <span
                key={index}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border",
                  filled ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-rule-strong text-muted-foreground",
                )}
                aria-hidden
              >
                {filled ? <StampIcon icon={program.stampIcon} className="size-4" /> : prize ? <Gift className="size-4" /> : null}
              </span>
            );
          })}
        </div>
      ) : (
        next && <Progress value={Math.min(100, (stamps / next.visitsRequired) * 100)} aria-label={`${stampsLabel(stamps)} de ${next.visitsRequired}`} />
      )}

      <p className="text-sm">
        {next ? (
          <>
            Próximo premio: <span className="font-medium">«{next.name}»</span>.{" "}
            <span className="text-muted-foreground">{describeMissing(next.missing)}.</span>
          </>
        ) : card ? (
          <span className="text-muted-foreground">Ya no hay premios por ganar en esta tarjeta.</span>
        ) : (
          <span className="text-muted-foreground">Todavía no tiene sellos: suma uno con cada cita atendida.</span>
        )}
      </p>
    </div>
  );
}
