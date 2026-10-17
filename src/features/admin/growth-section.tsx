import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GrowthPair, ISODate, PlatformStats } from "@/types";
import { GrowthChart } from "./growth-chart";
import { growthChange } from "./sales-lists";

/**
 * El periodo, para leerlo después de "frente a": "el 1–13 de septiembre", "el 1 de octubre" o
 * "todo febrero" (cuando el mes pasado fue más corto y se compara entero).
 */
function periodLabel(from: ISODate, to: ISODate): string {
  const month = formatDate(from, "MMMM");
  if (from.slice(0, 7) !== to.slice(0, 7)) return `todo ${month}`;
  const first = Number(from.slice(8));
  const last = Number(to.slice(8));
  return first === last ? `el ${first} de ${month}` : `el ${first}–${last} de ${month}`;
}

/** "Del 1 al 13 de octubre" o "El 1 de octubre". */
function currentLabel(from: ISODate, to: ISODate): string {
  const first = Number(from.slice(8));
  const last = Number(to.slice(8));
  return first === last ? `El ${first} de ${formatDate(from, "MMMM")}` : `Del ${first} al ${last} de ${formatDate(from, "MMMM")}`;
}

const METRICS: { key: keyof Pick<PlatformStats["growth"], "appointments" | "onlineBookings" | "newClients" | "newBusinesses">; label: string }[] = [
  { key: "appointments", label: "Citas agendadas" },
  { key: "onlineBookings", label: "Reservas online" },
  { key: "newClients", label: "Pacientes nuevos" },
  { key: "newBusinesses", label: "Negocios nuevos" },
];

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

/** «Crecimiento del mes»: lo que va del mes frente a los mismos días del mes pasado (spec 006). */
export function GrowthSection({ growth }: { growth: PlatformStats["growth"] | undefined }) {
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
        {METRICS.map(({ key, label }) => {
          const pair = growth?.[key];
          return (
            <Card key={key} className="gap-1.5 px-4 py-4 sm:px-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              {!pair ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-extrabold tracking-[-0.02em] tabular-nums sm:text-3xl">{pair.current}</span>
                    <Change pair={pair} />
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {pair.previous} {growth && periodLabel(growth.previousFrom, growth.previousTo).replace(/^el /, "del ").replace(/^todo /, "en todo ")}
                  </p>
                </>
              )}
            </Card>
          );
        })}
      </div>
      {growth?.daily && <GrowthChart growth={growth} />}
    </section>
  );
}
