import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsRateKey, BusinessAnalytics, CategoryAnalytics, HealthGroup } from "@/types";
import { formatRate, HEALTH_LABELS, HEALTH_TONES, versusTone } from "./analytics-format";

const BADGE = "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

/** «82 · Sano»: la puntuación de salud con su grupo (el color siempre va con el texto). */
export function HealthBadge({ score, group, className }: { score: number; group: HealthGroup; className?: string }) {
  return (
    <span className={cn(BADGE, HEALTH_TONES[group], className)}>
      <span className="font-bold tabular-nums">{score}</span> · {HEALTH_LABELS[group]}
    </span>
  );
}

/** «Pocos datos»: menos de 10 citas en el periodo (el negocio) o menos de 3 negocios con datos (el tipo). */
export function FewDataTag({ className }: { className?: string }) {
  return <span className={cn(BADGE, "bg-zinc-100 text-zinc-600 ring-zinc-500/20", className)}>Pocos datos</span>;
}

/**
 * Una tasa del negocio y, debajo, la de su tipo («tipo 12 %»), resaltada si es muy distinta: en verde si
 * es mejor y en rojo si es peor, con su flecha. Con «pocos datos», la tasa se ve atenuada y con la marca.
 */
export function RateValue({
  business,
  rateKey,
  category,
}: {
  business: BusinessAnalytics;
  rateKey: AnalyticsRateKey;
  category: CategoryAnalytics | null;
}) {
  const value = business[rateKey];
  const typical = category && !category.fewData ? category.medians[rateKey] : null;
  const versus = business.versusType[rateKey];
  const tone = versusTone(rateKey, versus);
  const Arrow = versus === "above" ? ArrowUp : ArrowDown;
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className={cn("font-semibold tabular-nums", business.fewData && "text-muted-foreground")}>{formatRate(value)}</span>
      {business.fewData ? (
        <span className="text-[0.6875rem] text-muted-foreground">pocos datos</span>
      ) : (
        typical !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[0.6875rem] tabular-nums",
              tone === "good" ? "font-semibold text-emerald-700" : tone === "bad" ? "font-semibold text-rose-700" : "text-muted-foreground",
            )}
          >
            {tone && <Arrow className="size-3" aria-hidden />}
            tipo {formatRate(typical)}
            {tone && <span className="sr-only">{versus === "above" ? " (muy por encima)" : " (muy por debajo)"}</span>}
          </span>
        )
      )}
    </span>
  );
}
