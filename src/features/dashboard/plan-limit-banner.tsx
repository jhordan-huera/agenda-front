import { Sparkles } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/auth/use-permissions";
import { isNearLimit } from "@/features/billing/plan-usage";
import { usePlanUsage } from "@/hooks/queries/use-account";
import { getNextPlan } from "@/lib/constants/plans";

/** Aviso cuando el plan está cerca del límite de citas del mes (≥ 80 %). */
export function PlanLimitBanner() {
  const { data: usage } = usePlanUsage();
  const { can } = usePermissions();
  if (!usage) return null;

  const limit = usage.limits.appointmentsPerMonth;
  if (!isNearLimit(usage.appointmentsThisMonth, limit)) return null;
  const reached = limit !== null && usage.appointmentsThisMonth >= limit;
  const next = getNextPlan(usage.plan);

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center"
    >
      <Sparkles className="size-5 shrink-0 text-amber-600" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium">
          {reached ? "Has alcanzado el límite de citas de tu plan." : `Has usado ${usage.appointmentsThisMonth} de ${limit} citas este mes.`}
        </p>
        <p className="text-amber-800/80">
          {reached
            ? "No podrás crear nuevas citas ni recibir reservas online hasta el próximo mes."
            : "Cuando llegues al límite no podrás crear nuevas citas este mes."}
          {next && ` El plan ${next.name} incluye citas ilimitadas.`}
        </p>
      </div>
      {next && can("billing.manage") && (
        <Button asChild size="sm" className="shrink-0">
          <Link to="/dashboard/settings?tab=suscripcion">Actualizar a {next.name}</Link>
        </Button>
      )}
    </div>
  );
}
