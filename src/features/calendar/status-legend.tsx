import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_CONFIG } from "@/lib/constants/appointment-status";
import { cn } from "@/lib/utils";

export function StatusLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {APPOINTMENT_STATUSES.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", APPOINTMENT_STATUS_CONFIG[status].dot)} aria-hidden />
          {APPOINTMENT_STATUS_CONFIG[status].label}
        </li>
      ))}
    </ul>
  );
}
