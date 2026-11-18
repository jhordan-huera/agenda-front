import { Search, Ticket, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/use-permissions";
import { useLoyaltyBenefits, useLoyaltyMembers, useLoyaltyRewards } from "@/hooks/queries/use-loyalty";
import { describeBenefit, formatRewardCode, normalizeRewardCode } from "@/lib/constants/loyalty";
import type { LoyaltyRewardFilters } from "@/lib/data";
import { formatDayMonth } from "@/lib/format";
import type { Business, LoyaltyReward } from "@/types";
import { REWARD_STATUS_FILTERS, rewardDetail } from "./loyalty-text";
import { RedeemRewardDialog } from "./redeem-reward-dialog";
import { RewardStatusBadge } from "./reward-status-badge";

const ALL = "all";
const PAGE = 30;
const CODE_LENGTH = 6;

/**
 * «Recompensas» de Fidelización (spec 052): el historial, filtrable por paciente, beneficio y estado, y la búsqueda por
 * código («K7Q-3MD», escrito como sea) para canjearla.
 */
export function LoyaltyRewards({ business }: { business: Business }) {
  const { can } = usePermissions();
  const members = useLoyaltyMembers();
  const benefits = useLoyaltyBenefits();
  const [clientId, setClientId] = useState(ALL);
  const [benefitId, setBenefitId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [codeText, setCodeText] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [redeeming, setRedeeming] = useState<LoyaltyReward | null>(null);

  const code = normalizeRewardCode(codeText);
  const byCode = code.length === CODE_LENGTH;
  // Con el código completo se busca sólo por él; mientras se escribe, siguen los filtros.
  const filters: LoyaltyRewardFilters = byCode
    ? { code }
    : {
        clientId: clientId === ALL ? undefined : clientId,
        benefitId: benefitId === ALL ? undefined : benefitId,
        status: status === ALL ? undefined : status,
      };
  const query = useLoyaltyRewards(filters);
  const rewards = query.data ?? [];
  const patients = [...(members.data ?? [])].sort((a, b) => a.clientName.localeCompare(b.clientName, "es"));
  const filtered = byCode || clientId !== ALL || benefitId !== ALL || status !== ALL;

  const clearFilters = () => {
    setClientId(ALL);
    setBenefitId(ALL);
    setStatus(ALL);
    setCodeText("");
    setShown(PAGE);
  };
  const choose = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setShown(PAGE);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Código" hint={code.length > 0 && !byCode ? "El código tiene 6 caracteres, como K7Q-3MD." : undefined}>
          {(field) => (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                {...field}
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="K7Q-3MD"
                className="pl-8 font-mono uppercase"
                maxLength={12}
                value={codeText}
                onChange={(event) => {
                  setCodeText(event.target.value);
                  setShown(PAGE);
                }}
              />
            </div>
          )}
        </FormField>
        <FormField label="Paciente">
          {(field) => (
            <Select value={clientId} onValueChange={choose(setClientId)} disabled={byCode}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-72">
                <SelectItem value={ALL}>Todos los pacientes</SelectItem>
                {patients.map((member) => (
                  <SelectItem key={member.clientId} value={member.clientId}>
                    {member.clientName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Beneficio">
          {(field) => (
            <Select value={benefitId} onValueChange={choose(setBenefitId)} disabled={byCode}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={ALL}>Todos los beneficios</SelectItem>
                {(benefits.data ?? []).map((benefit) => (
                  <SelectItem key={benefit.id} value={benefit.id}>
                    {benefit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Estado">
          {(field) => (
            <Select value={status} onValueChange={choose(setStatus)} disabled={byCode}>
              <SelectTrigger {...field} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {REWARD_STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>

      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : rewards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-background px-4 py-10 text-center text-sm text-muted-foreground">
          <Ticket className="size-6" aria-hidden />
          {byCode
            ? `No hay ninguna recompensa con el código ${formatRewardCode(code)}.`
            : filtered
              ? "Ninguna recompensa con estos filtros."
              : "Todavía nadie ganó un premio. Aquí verás cada recompensa con su código."}
          {filtered && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X /> Quitar los filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" role="status">
            {rewards.length === 1 ? "1 recompensa" : `${rewards.length} recompensas`}
          </p>
          <ul className="divide-y rounded-xl border bg-card">
            {rewards.slice(0, shown).map((reward) => (
              <li key={reward.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/dashboard/clients/${reward.clientId}`} className="font-medium hover:underline">
                      {reward.clientName}
                    </Link>
                    <RewardStatusBadge status={reward.status} />
                  </div>
                  <p className="text-sm">
                    {reward.name}
                    <span className="text-muted-foreground"> · {describeBenefit(reward.kind, reward.value, reward.serviceName, business.currency)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{formatRewardCode(reward.code)}</span> · Ganada el{" "}
                    {formatDayMonth(reward.unlockedAt, business.timezone)} · {rewardDetail(reward, business.timezone)}
                  </p>
                </div>
                {reward.status === "available" && can("loyalty.redeem") && (
                  <Button size="sm" className="self-start sm:self-auto" onClick={() => setRedeeming(reward)}>
                    <Ticket /> Canjear
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {shown < rewards.length && (
            <Button variant="ghost" size="sm" onClick={() => setShown(shown + PAGE)}>
              Ver más ({rewards.length - shown})
            </Button>
          )}
        </>
      )}

      <RedeemRewardDialog reward={redeeming} onOpenChange={(open) => !open && setRedeeming(null)} />
    </div>
  );
}
