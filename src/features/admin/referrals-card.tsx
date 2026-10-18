import { Gift } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { CardTitleIcon } from "@/components/shared/card-title-icon";
import { FormField } from "@/components/shared/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSetReferredBy } from "@/hooks/queries/use-admin";
import { DEFAULT_TIMEZONE } from "@/lib/constants/app";
import { REFERRAL_QUALIFY_DAYS } from "@/lib/constants/business";
import { getErrorMessage } from "@/lib/data";
import { formatDate, toZonedDate } from "@/lib/format";
import { getZonedNow } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AdminBusinessReferrals, Business, ReferredBusiness } from "@/types";
import { daysSince } from "./sales-lists";
import { ReferrerCombobox } from "./referrer-combobox";

const BADGE = "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset";
const TONES = {
  done: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40",
  pending: "bg-accent text-ink ring-ink/20",
  waiting: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/40",
  suspended: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40",
};

/** «3 oct», en la zona del panel. */
const dayLabel = (iso: string) => formatDate(toZonedDate(iso), "d MMM");

/** Cómo va la recomendación: descuento aplicado, ganado y pendiente, suspendido o los días que faltan. */
function ReferredStatus({ referred, today }: { referred: ReferredBusiness; today: string }) {
  if (referred.rewardAppliedAt) return <span className={cn(BADGE, TONES.done)}>Descuento aplicado el {dayLabel(referred.rewardAppliedAt)}</span>;
  if (referred.qualified) return <span className={cn(BADGE, TONES.pending)}>Se quedó · descuento pendiente</span>;
  if (referred.status === "suspended") return <span className={cn(BADGE, TONES.suspended)}>Suspendido</span>;
  const left = Math.max(1, REFERRAL_QUALIFY_DAYS - (daysSince(referred.createdAt, today) ?? 0));
  return <span className={cn(BADGE, TONES.waiting)}>{left === 1 ? "Falta 1 día" : `Faltan ${left} días`}</span>;
}

/**
 * El programa de referidos en la ficha de /admin (spec 023): su código, «Recomendado por» (se guarda al
 * elegirlo, con su entrada en la actividad) y «Recomendó a», con cómo va cada recomendación.
 */
export function ReferralsCard({ business, code, referrals }: { business: Business; code: string; referrals: AdminBusinessReferrals }) {
  const setReferredBy = useSetReferredBy();
  const today = getZonedNow(DEFAULT_TIMEZONE).date;

  const change = async (referredBy: string | null) => {
    try {
      const saved = await setReferredBy.mutateAsync({ businessId: business.id, referredBy });
      toast.success(saved.referredBy ? `Recomendado por ${saved.referredBy.name}` : "Quitaste «Recomendado por»");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <CardTitleIcon icon={Gift} /> Referidos
        </CardTitle>
        <CardDescription>
          Su código es <span className="font-semibold text-ink">{code}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <FormField label="Recomendado por" hint="Se guarda al elegirlo y queda en la actividad.">
          {(field) => (
            <ReferrerCombobox
              {...field}
              value={referrals.referredBy?.id ?? null}
              excludeId={business.id}
              disabled={setReferredBy.isPending}
              onChange={change}
            />
          )}
        </FormField>
        <div className="grid gap-2 border-t pt-3">
          <p className="text-sm font-medium">Recomendó a</p>
          {referrals.referred.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía a nadie.</p>
          ) : (
            <ul className="-mx-2 divide-y">
              {referrals.referred.map((referred) => (
                <li key={referred.id}>
                  <Link
                    to={`/admin/businesses/${referred.id}`}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-2 py-2 hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{referred.name}</span>
                      <span className="block text-xs text-muted-foreground">Desde el {dayLabel(referred.createdAt)}</span>
                    </span>
                    <ReferredStatus referred={referred} today={today} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
