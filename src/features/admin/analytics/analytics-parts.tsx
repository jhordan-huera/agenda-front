import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsRateKey, BusinessAnalytics, CategoryAnalytics, HealthGroup } from "@/types";
import { formatRate, HEALTH_LABELS, HEALTH_TONES, typicalRate, versusTone } from "./analytics-format";

const BADGE = "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

/** «82 · Sano»: la puntuación de salud con su grupo (el color siempre va con el texto). */
export function HealthBadge({ score, group, className }: { score: number; group: HealthGroup; className?: string }) {
  return (
    <span className={cn(BADGE, HEALTH_TONES[group], className)}>
      <span className="font-bold tabular-nums">{score}</span> · {HEALTH_LABELS[group]}
    </span>
  );
}

/** Lo que significa «Pocos datos» en un negocio (el `title` de su insignia). */
export const FEW_DATA_HINT =
  "Menos de 10 citas en el periodo: sus tasas se ven atenuadas, no se comparan con su tipo ni cuentan para él y, al ordenar por una tasa, van al final";

/** «Pocos datos»: menos de 10 citas en el periodo (el negocio) o menos de 3 negocios con datos (el tipo). */
export function FewDataTag({ className, title }: { className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(BADGE, "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/40", className)}
    >
      Pocos datos
    </span>
  );
}

/**
 * «tipo 12 %»: la tasa del tipo, resaltada si la del negocio es muy distinta: en verde si es mejor y en
 * rojo si es peor, con su flecha. Nada si no se compara.
 */
export function TypicalRate({
  business,
  rateKey,
  category,
}: {
  business: BusinessAnalytics;
  rateKey: AnalyticsRateKey;
  category: CategoryAnalytics | null;
}) {
  const typical = typicalRate(business, rateKey, category);
  if (typical === null) return null;
  const versus = business.versusType[rateKey];
  const tone = versusTone(rateKey, versus);
  const Arrow = versus === "above" ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        tone === "good" ? "font-semibold text-emerald-700 dark:text-emerald-300" : tone === "bad" ? "font-semibold text-rose-700 dark:text-rose-300" : "",
      )}
    >
      {tone && <Arrow className="size-3" aria-hidden />}
      tipo {formatRate(typical)}
      {tone && <span className="sr-only">{versus === "above" ? " (muy por encima)" : " (muy por debajo)"}</span>}
    </span>
  );
}
