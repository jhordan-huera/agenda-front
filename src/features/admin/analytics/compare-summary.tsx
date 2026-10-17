import { ArrowRight, Banknote, CalendarCheck, CalendarClock, HeartPulse, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatCurrency, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BusinessAnalytics } from "@/types";
import { formatGrowth } from "./analytics-format";

type Tone = "default" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  default: "bg-accent text-ink",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

/** Las sumas del resumen, con los negocios que dejan ver los filtros y la búsqueda. */
interface CompareTotals {
  appointments: number;
  previousAppointments: number;
  /** Frente al periodo anterior; "new" si antes no hubo citas y ahora sí; null sin citas en ninguno. */
  growth: number | "new" | null;
  unclosed: number;
  /** Negocios con alguna cita sin cerrar. */
  unclosedBusinesses: number;
  /** Las monedas de los negocios: con más de una, los ingresos no se suman. */
  currencies: string[];
  estimatedRevenue: number;
  collected: number;
  /** «En riesgo» o «críticos». */
  atRisk: number;
  healthy: number;
}

function summarize(rows: BusinessAnalytics[]): CompareTotals {
  const sum = (pick: (business: BusinessAnalytics) => number) => rows.reduce((total, business) => total + pick(business), 0);
  const appointments = sum((business) => business.appointments);
  const previousAppointments = sum((business) => business.previousAppointments);
  return {
    appointments,
    previousAppointments,
    growth: previousAppointments > 0 ? (appointments - previousAppointments) / previousAppointments : appointments > 0 ? "new" : null,
    unclosed: sum((business) => business.unclosed),
    unclosedBusinesses: rows.filter((business) => business.unclosed > 0).length,
    currencies: [...new Set(rows.map((business) => business.currency))].sort(),
    estimatedRevenue: sum((business) => business.estimatedRevenue),
    collected: sum((business) => business.collected),
    atRisk: rows.filter((business) => business.health.group !== "healthy").length,
    healthy: rows.filter((business) => business.health.group === "healthy").length,
  };
}

interface SummaryCardProps {
  label: string;
  icon: LucideIcon;
  tone?: Tone;
  value: ReactNode;
  detail: ReactNode;
  /** Si se da, la tarjeta es un botón que lleva al ranking; `action` lo dice al lector de pantalla. */
  onClick?: () => void;
  action?: string;
}

/** Una cifra del resumen. Con `onClick`, un botón: cambia la cifra y el orden del ranking. */
function SummaryCard({ label, icon: Icon, tone = "default", value, detail, onClick, action }: SummaryCardProps) {
  const content = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[0.8125rem] leading-tight text-muted-foreground sm:text-sm">{label}</span>
        <span className={cn("hidden size-8 shrink-0 items-center justify-center rounded-lg sm:flex", TONES[tone])} aria-hidden>
          <Icon className="size-4" />
        </span>
      </span>
      <span className="mt-auto block text-2xl leading-tight font-extrabold tracking-tight tabular-nums">{value}</span>
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0">{detail}</span>
        {onClick && <ArrowRight className="size-3.5 shrink-0 text-ink opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />}
      </span>
    </>
  );
  const base = "flex min-w-0 flex-col gap-1 rounded-xl bg-card p-3.5 text-left ring-1 ring-foreground/10 sm:p-4";
  if (!onClick) return <div className={base}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        base,
        "group cursor-pointer transition-[box-shadow,background-color] outline-none hover:bg-accent/40 hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      {content}
      {action && <span className="sr-only">. {action}</span>}
    </button>
  );
}

interface CompareSummaryProps {
  rows: BusinessAnalytics[];
  /** «Sin cerrar»: el ranking por «Sin cerrar», de mayor a menor. */
  onUnclosed: () => void;
  /** «Salud»: el ranking por «Salud», de menor a mayor. */
  onHealth: () => void;
}

/**
 * El resumen de arriba de «Comparar»: citas, sin cerrar, ingresos y salud de los negocios que dejan ver
 * los filtros y la búsqueda. «Sin cerrar» y «Salud» llevan al ranking ya ordenado.
 */
export function CompareSummary({ rows, onUnclosed, onHealth }: CompareSummaryProps) {
  const totals = summarize(rows);
  const oneCurrency = totals.currencies.length <= 1;
  const currency = totals.currencies[0];
  const healthTone: Tone = rows.some((business) => business.health.group === "critical") ? "danger" : totals.atRisk > 0 ? "warning" : "success";

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard
        label="Citas"
        icon={CalendarCheck}
        value={totals.appointments}
        detail={
          <>
            <span
              className={cn(
                "font-semibold tabular-nums",
                typeof totals.growth === "number" && totals.growth > 0 && "text-emerald-700 dark:text-emerald-300",
                typeof totals.growth === "number" && totals.growth < 0 && "text-rose-700 dark:text-rose-300",
              )}
            >
              {totals.growth === null ? "—" : formatGrowth(totals.growth)}
            </span>{" "}
            · antes {totals.previousAppointments}
          </>
        }
      />
      <SummaryCard
        label="Sin cerrar"
        icon={CalendarClock}
        tone={totals.unclosed > 0 ? "warning" : "default"}
        value={<span className={cn(totals.unclosed > 0 && "text-amber-700 dark:text-amber-300")}>{totals.unclosed}</span>}
        detail={totals.unclosedBusinesses ? `en ${plural(totals.unclosedBusinesses, "negocio", "negocios")}` : "en ningún negocio"}
        onClick={onUnclosed}
        action="Ver en el ranking, de más a menos"
      />
      <SummaryCard
        label="Ingresos estimados"
        icon={Banknote}
        value={oneCurrency ? formatCurrency(totals.estimatedRevenue, currency) : <span className="text-lg">Varias monedas</span>}
        detail={oneCurrency ? `cobrado ${formatCurrency(totals.collected, currency)}` : `${totals.currencies.join(", ")}: no se suman`}
      />
      <SummaryCard
        label="Salud"
        icon={HeartPulse}
        tone={healthTone}
        value={
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={cn(healthTone === "danger" ? "text-rose-700 dark:text-rose-300" : healthTone === "warning" && "text-amber-700 dark:text-amber-300")}>
              {totals.atRisk}
            </span>
            <span className="text-xs font-medium tracking-normal text-muted-foreground">en riesgo o críticos</span>
          </span>
        }
        detail={plural(totals.healthy, "sano", "sanos")}
        onClick={onHealth}
        action="Ver en el ranking, de menos a más salud"
      />
    </div>
  );
}
