import { getPlan } from "@/lib/constants/plans";
import { cn } from "@/lib/utils";
import type { BusinessStatus, PlanId } from "@/types";

const BADGE = "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

export function BusinessStatusBadge({ status, className }: { status: BusinessStatus; className?: string }) {
  return (
    <span
      className={cn(
        BADGE,
        status === "active"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40"
          : "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40",
        className,
      )}
    >
      {status === "active" ? "Activo" : "Suspendido"}
    </span>
  );
}

const PLAN_TONES: Record<PlanId, string> = {
  free: "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/40",
  pro: "bg-accent text-ink ring-ink/20",
  business: "bg-ink text-primary-foreground ring-ink",
};

export function PlanBadge({ plan, className }: { plan: PlanId; className?: string }) {
  return <span className={cn(BADGE, PLAN_TONES[plan], className)}>{getPlan(plan).name}</span>;
}

export function UserStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        BADGE,
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40"
          : "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/40",
      )}
    >
      {active ? "Activo" : "Desactivado"}
    </span>
  );
}
