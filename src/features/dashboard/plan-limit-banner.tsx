import { CalendarClock } from "lucide-react";
import { isNearLimit } from "@/features/billing/plan-usage";
import { PlanLimitContact } from "@/features/support/plan-limit-contact";
import { usePlanUsage } from "@/hooks/queries/use-account";

/** Aviso cuando el negocio está cerca de su límite de citas del mes (≥ 80 %). */
export function PlanLimitBanner() {
  const { data: usage } = usePlanUsage();
  if (!usage) return null;

  const limit = usage.limits.appointmentsPerMonth;
  if (!isNearLimit(usage.appointmentsThisMonth, limit)) return null;
  const reached = limit !== null && usage.appointmentsThisMonth >= limit;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center"
    >
      <CalendarClock className="size-5 shrink-0 text-amber-600" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium">
          {reached ? "Llegaste al límite de citas de este mes." : `Llevas ${usage.appointmentsThisMonth} de ${limit} citas este mes.`}
        </p>
        <p className="text-amber-800/80">
          {reached
            ? "No podrás crear nuevas citas ni recibir reservas online hasta el próximo mes. "
            : "Al llegar al límite no podrás crear nuevas citas este mes. "}
          Para ampliarlo, escríbenos a <PlanLimitContact />.
        </p>
      </div>
    </div>
  );
}
