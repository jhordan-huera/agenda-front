import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: ReactNode;
  loading?: boolean;
}

export function StatCard({ label, value, icon: Icon, hint, loading }: StatCardProps) {
  return (
    <Card className="gap-3 px-3.5 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      )}
      {hint && !loading && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
