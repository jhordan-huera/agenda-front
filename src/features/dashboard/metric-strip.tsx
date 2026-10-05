import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Metric {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

/** Cifras del negocio en una sola franja: se leen de corrido, como una línea de la agenda. */
export function MetricStrip({ metrics, loading, className }: { metrics: Metric[]; loading?: boolean; className?: string }) {
  return (
    // Renglones con sombras de 1px a la derecha y abajo: el borde exterior las recorta y una
    // última fila incompleta queda limpia (sin huecos de color).
    <dl className={cn("grid grid-cols-2 overflow-hidden rounded-xl border bg-card md:grid-cols-3 2xl:grid-cols-6", className)}>
      {metrics.map((metric) => (
        <div key={metric.label} className="flex flex-col gap-0.5 p-4 shadow-[1px_0_0_0_var(--rule),0_1px_0_0_var(--rule)]">
          <dt className="text-sm text-muted-foreground">{metric.label}</dt>
          <dd className="text-2xl font-bold tracking-[-0.02em] tabular-nums">
            {loading ? <Skeleton className="h-8 w-16" /> : metric.value}
          </dd>
          {metric.hint && !loading && <dd className="text-sm text-muted-foreground">{metric.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
