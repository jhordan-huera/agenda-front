import { cn } from "@/lib/utils";
import type { LoyaltyRewardStatus } from "@/types";
import { REWARD_STATUS_LABELS } from "./loyalty-text";

/** El estado de una recompensa: la disponible, en el tono de la marca; las demás, en gris. */
export function RewardStatusBadge({ status, className }: { status: LoyaltyRewardStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        status === "available" ? "bg-accent text-ink" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {REWARD_STATUS_LABELS[status]}
    </span>
  );
}
