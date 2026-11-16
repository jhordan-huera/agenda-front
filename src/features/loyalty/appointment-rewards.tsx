import { Gift, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { useClientsLoyalty } from "@/hooks/queries/use-loyalty";
import { describeBenefit, formatRewardCode } from "@/lib/constants/loyalty";
import type { Appointment, Client, LoyaltyReward } from "@/types";
import { availableLabel, rewardDetail } from "./loyalty-text";
import { RedeemRewardDialog } from "./redeem-reward-dialog";

/**
 * En la ficha de una cita (spec 052): si algún paciente tiene recompensas disponibles, «Tiene 1 premio disponible»
 * con «Canjear en esta cita» (propietario, administradores y Recepción; el rol Profesional sólo lo ve). En una cita
 * cancelada no sale: ahí no se canjea.
 */
export function AppointmentRewards({
  appointment,
  patients,
  currency,
  timezone,
}: {
  appointment: Appointment;
  /** Los pacientes de la cita (las reservas restringidas ya fuera). */
  patients: Client[];
  currency?: string;
  timezone: string;
}) {
  const active = appointment.status !== "cancelled";
  const queries = useClientsLoyalty(
    patients.map((patient) => patient.id),
    active,
  );
  const { can } = usePermissions();
  const [redeeming, setRedeeming] = useState<LoyaltyReward | null>(null);
  if (!active) return null;

  const withRewards = patients.flatMap((patient, index) => {
    const rewards = (queries[index]?.data?.rewards ?? []).filter((reward) => reward.status === "available");
    return rewards.length > 0 ? [{ patient, rewards }] : [];
  });
  if (withRewards.length === 0) return null;
  const canRedeem = can("loyalty.redeem");

  return (
    <section aria-labelledby="appointment-rewards-heading" className="space-y-3 rounded-lg border border-primary/30 bg-accent/50 p-3">
      <h3 id="appointment-rewards-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Gift className="size-4 shrink-0" aria-hidden />
        {withRewards.length === 1 && patients.length === 1
          ? `Tiene ${availableLabel(withRewards[0].rewards.length)}`
          : "Premios disponibles"}
      </h3>
      {withRewards.map(({ patient, rewards }) => (
        <div key={patient.id} className="space-y-2">
          {patients.length > 1 && (
            <p className="text-sm font-medium">
              {patient.name} · {availableLabel(rewards.length)}
            </p>
          )}
          <ul className="space-y-2">
            {rewards.map((reward) => (
              <li key={reward.id} className="flex flex-col gap-2 rounded-md bg-background p-2.5">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{reward.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {describeBenefit(reward.kind, reward.value, reward.serviceName, currency)} ·{" "}
                    <span className="font-mono text-foreground">{formatRewardCode(reward.code)}</span> · {rewardDetail(reward, timezone)}
                  </p>
                </div>
                {canRedeem && (
                  <Button size="sm" className="self-start" onClick={() => setRedeeming(reward)}>
                    <Ticket /> Canjear en esta cita
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {!canRedeem && <p className="text-xs text-muted-foreground">Lo canjean Recepción, los administradores o el propietario.</p>}
      <RedeemRewardDialog reward={redeeming} appointment={appointment} onOpenChange={(open) => !open && setRedeeming(null)} />
    </section>
  );
}
