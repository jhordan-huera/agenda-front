import { getPlan } from "@/lib/constants/plans";
import { cn } from "@/lib/utils";
import type { BusinessStatus, PlanId } from "@/types";

const BADGE = "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

export function BusinessStatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <span
      className={cn(
        BADGE,
        status === "active"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          : "bg-amber-50 text-amber-800 ring-amber-600/25",
      )}
    >
      {status === "active" ? "Activo" : "Suspendido"}
    </span>
  );
}

const PLAN_TONES: Record<PlanId, string> = {
  free: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
  pro: "bg-accent text-ink ring-ink/20",
  business: "bg-ink text-white ring-ink",
};

export function PlanBadge({ plan }: { plan: PlanId }) {
  return <span className={cn(BADGE, PLAN_TONES[plan])}>{getPlan(plan).name}</span>;
}

export function UserStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        BADGE,
        active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
      )}
    >
      {active ? "Activo" : "Desactivado"}
    </span>
  );
}
