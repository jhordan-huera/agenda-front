import { Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/features/auth/use-permissions";
import { UsageMeter } from "@/features/billing/usage-meter";
import { usePlanUsage } from "@/hooks/queries/use-account";
import { getNextPlan, getPlan } from "@/lib/constants/plans";

/** Plan actual en la barra lateral; en planes con límite de citas muestra el uso del mes. */
export function PlanStatus({ onNavigate }: { onNavigate?: () => void }) {
  const { data: usage } = usePlanUsage();
  const { can } = usePermissions();
  if (!usage) return <Skeleton className="h-14 w-full" />;

  const plan = getPlan(usage.plan);
  const next = getNextPlan(usage.plan);
  const limited = usage.limits.appointmentsPerMonth !== null;

  return (
    <div className="space-y-2 rounded-lg border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Plan {plan.name}</span>
        {next && can("billing.manage") && (
          <Link
            to="/dashboard/settings?tab=suscripcion"
            onClick={onNavigate}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Sparkles className="size-3" aria-hidden /> Mejorar
          </Link>
        )}
      </div>
      {limited && (
        <UsageMeter label="Citas este mes" used={usage.appointmentsThisMonth} limit={usage.limits.appointmentsPerMonth} />
      )}
    </div>
  );
}
