import { APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const config = APPOINTMENT_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        config.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden />
      {config.label}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium",
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
          : "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-500/20",
      )}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
