import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GrowthPair, PlatformStats } from "@/types";
import { GrowthChart } from "./growth-chart";
import { GrowthDetailSheet } from "./growth-detail-sheet";
import { currentLabel, GROWTH_METRICS, periodLabel, type GrowthMetric } from "./growth-labels";
import { growthChange } from "./sales-lists";

function Change({ pair }: { pair: GrowthPair }) {
  const { kind, percent } = growthChange(pair);
  const styles = {
    up: { icon: ArrowUpRight, text: `+${percent} %`, className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
    down: { icon: ArrowDownRight, text: `${percent} %`, className: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
    same: { icon: Minus, text: "igual", className: "bg-muted text-muted-foreground" },
    new: { icon: Sparkles, text: "nuevo", className: "bg-accent text-primary" },
  }[kind];
  const label = kind === "up" ? `sube ${percent} %` : kind === "down" ? `baja ${Math.abs(percent)} %` : styles.text;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", styles.className)}>
      <styles.icon className="size-3.5" aria-hidden />
      <span aria-hidden>{styles.text}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * «Crecimiento del mes»: lo que va del mes frente a los mismos días del mes pasado (spec 006). Cada tarjeta abre su
 * detalle por negocio (spec 042).
 */
export function GrowthSection({ growth }: { growth: PlatformStats["growth"] | undefined }) {
  const [open, setOpen] = useState<GrowthMetric | null>(null);
  return (
    <section aria-labelledby="growth-title" className="space-y-3">
      <div>
        <h2 id="growth-title" className="text-lg font-bold">
          Crecimiento del mes
        </h2>
        <p className="text-sm text-muted-foreground">
          {growth
            ? `${currentLabel(growth.from, growth.to)}, frente a ${periodLabel(growth.previousFrom, growth.previousTo).replace(/^el /, "lo del ")}.`
            : "Lo que va del mes, frente a los mismos días del mes pasado."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {GROWTH_METRICS.map(({ key, label }) => {
          const pair = growth?.[key];
          if (!growth || !pair) {
            return (
              <Card key={key} className="gap-1.5 px-4 py-4 sm:px-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Skeleton className="h-8 w-24" />
              </Card>
            );
          }
          return (
            <Card
              key={key}
              className="gap-0 p-0 transition-shadow has-[button:focus-visible]:ring-[3px] has-[button:focus-visible]:ring-ring/50 hover:ring-foreground/20"
            >
              {/* Toda la tarjeta abre su detalle por negocio (spec 042). */}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setOpen(key)}
                className="group flex h-full flex-col gap-1.5 px-4 py-4 text-left outline-none hover:bg-muted/40 sm:px-5"
              >
                <span className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  {label}
                  <ChevronRight aria-hidden className="size-4 shrink-0 transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-foreground" />
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-extrabold tracking-[-0.02em] tabular-nums sm:text-3xl">{pair.current}</span>
                  <Change pair={pair} />
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {pair.previous} {periodLabel(growth.previousFrom, growth.previousTo).replace(/^el /, "del ").replace(/^todo /, "en todo ")}
                </span>
                <span className="sr-only">. Ver de qué negocios son.</span>
              </button>
            </Card>
          );
        })}
      </div>
      {growth?.daily && <GrowthChart growth={growth} />}
      {growth && <GrowthDetailSheet metric={open} growth={growth} onClose={() => setOpen(null)} />}
    </section>
  );
}
