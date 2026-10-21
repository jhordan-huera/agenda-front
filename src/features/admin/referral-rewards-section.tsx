import { Gift } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplyReferralReward, useReferralRewards } from "@/hooks/queries/use-admin";
import { formatReferralAmount, REFERRAL_DISCOUNT } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { formatDate, plural, toZonedDate } from "@/lib/format";
import type { ReferralReward } from "@/types";

/** Los descuentos de cada negocio que recomendó, juntos: varios el mismo mes se suman. */
function byReferrer(rewards: ReferralReward[]) {
  const groups = new Map<string, { referrer: ReferralReward["referrer"]; rewards: ReferralReward[]; total: number }>();
  for (const reward of rewards) {
    const group = groups.get(reward.referrer.id) ?? { referrer: reward.referrer, rewards: [], total: 0 };
    group.rewards.push(reward);
    group.total += reward.amount;
    groups.set(reward.referrer.id, group);
  }
  return [...groups.values()];
}

/**
 * «Descuentos por referidos» del Inicio de /admin (spec 023), junto a «Negocios para vender»: los ganados
 * y pendientes, de quién y por quién, desde cuándo y el monto (los de un mismo negocio, sumados). «Marcar
 * como aplicado» se confirma aquí mismo y queda en la actividad de la plataforma.
 */
export function ReferralRewardsSection() {
  const rewards = useReferralRewards();
  const apply = useApplyReferralReward();
  // El descuento elegido se conserva al cerrar para que el texto no cambie durante la animación.
  const [dialog, setDialog] = useState<{ open: boolean; reward: ReferralReward | null }>({ open: false, reward: null });
  const confirming = dialog.reward;
  const groups = byReferrer(rewards.data ?? []);

  return (
    <section aria-labelledby="referral-rewards-title" className="space-y-3">
      <div>
        <h2 id="referral-rewards-title" className="text-lg font-bold">
          Descuentos por referidos
        </h2>
        <p className="text-sm text-muted-foreground">
          Quién ganó {formatReferralAmount(REFERRAL_DISCOUNT)} menos en su siguiente mensualidad por recomendar un negocio que se quedó. Con mensualidad,
          el descuento va solo en su siguiente cobro (y deja de salir aquí); los demás, márcalos al cobrar.
        </p>
      </div>
      {rewards.isError ? (
        <ErrorState onRetry={() => rewards.refetch()} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5">
              <CardTitleIcon icon={Gift} /> Pendientes de aplicar
            </CardTitle>
            <CardDescription>
              {rewards.isPending
                ? "Cargando…"
                : rewards.data?.length
                  ? plural(rewards.data.length, "descuento", "descuentos")
                  : "Ninguno por ahora."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rewards.isPending ? (
              <Skeleton className="h-20" />
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cuando un negocio recomendado siga activo a los 30 días, quien lo recomendó aparece aquí.
              </p>
            ) : (
              <ul className="grid gap-3">
                {groups.map((group) => (
                  <li key={group.referrer.id} className="rounded-lg border">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-3 py-2.5">
                      <Link to={`/admin/businesses/${group.referrer.id}`} className="min-w-0 truncate font-semibold hover:underline">
                        {group.referrer.name}
                      </Link>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatReferralAmount(group.total)}
                        {group.rewards.length > 1 && (
                          <span className="font-normal text-muted-foreground"> · {plural(group.rewards.length, "descuento", "descuentos")}</span>
                        )}
                      </span>
                    </div>
                    <ul className="divide-y">
                      {group.rewards.map((reward) => (
                        <li key={reward.business.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 text-sm">
                          <span className="min-w-0">
                            <span className="block">
                              Recomendó a{" "}
                              <Link to={`/admin/businesses/${reward.business.id}`} className="font-medium hover:underline">
                                {reward.business.name}
                              </Link>
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Ganado el {formatDate(toZonedDate(reward.earnedAt), "d 'de' MMMM")} · {formatReferralAmount(reward.amount)}
                            </span>
                          </span>
                          <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, reward })}>
                            Marcar como aplicado
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        title={confirming ? `¿Ya aplicaste el descuento a ${confirming.referrer.name}?` : ""}
        description={
          confirming
            ? `${formatReferralAmount(confirming.amount)} menos en su siguiente mensualidad por recomendar a ${confirming.business.name}. Sale de los pendientes y queda en la actividad; no se vuelve a ganar.`
            : ""
        }
        confirmLabel="Marcar como aplicado"
        onConfirm={async () => {
          if (!confirming) return;
          try {
            await apply.mutateAsync(confirming.business.id);
            toast.success("Descuento marcado como aplicado");
          } catch (error) {
            toast.error(getErrorMessage(error));
            throw error;
          }
        }}
      />
    </section>
  );
}
