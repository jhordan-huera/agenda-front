import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  /** null = ilimitado. */
  limit: number | null;
  className?: string;
}

/** Medidor de uso del plan: el relleno indica la severidad (normal → aviso → límite). */
export function UsageMeter({ label, used, limit, className }: UsageMeterProps) {
  const ratio = limit ? Math.min(used / limit, 1) : 0;
  const tone = ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {used} / {limit ?? "ilimitado"}
        </span>
      </div>
      {limit !== null && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={used}
        >
          <div className={cn("h-full rounded-full transition-[width]", tone)} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}
