import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "success" | "warning" | "danger";

const TONES: Record<StatTone, string> = {
  default: "bg-accent text-ink",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
};

export interface StatItem {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Una línea debajo de la cifra (p. ej. «de 20 en su plan»). */
  hint?: ReactNode;
  /** Color del ícono: el de la marca o uno de estado (siempre acompañado del texto). */
  tone?: StatTone;
}

/** Una cifra del panel de plataforma con su ícono (spec 007). */
export function StatCard({ label, value, icon: Icon, hint, tone = "default" }: StatItem) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10 sm:p-4">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10", TONES[tone])} aria-hidden>
        <Icon className="size-[18px] sm:size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.8125rem] leading-tight text-muted-foreground sm:text-sm">{label}</p>
        <p className="mt-0.5 text-2xl leading-tight font-extrabold tracking-tight tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * La fila de cifras bajo el encabezado: 2 columnas en el celular y 4 (o 3) en pantallas anchas. Con 3
 * cifras, en el celular la última ocupa el ancho entero.
 */
export function StatGrid({ items, loading, count = 4 }: { items: StatItem[]; loading?: boolean; count?: number }) {
  const three = (loading ? count : items.length) === 3;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3",
        three ? "sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1" : "lg:grid-cols-4",
      )}
    >
      {loading
        ? Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-[78px] rounded-xl" />)
        : items.map((item) => <StatCard key={item.label} {...item} />)}
    </div>
  );
}
