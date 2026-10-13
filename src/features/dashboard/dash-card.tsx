import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tarjeta blanca del Inicio, sobre el lienzo gris del panel. */
export function DashCard({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)] sm:p-6", className)}
      {...props}
    />
  );
}

/** Una cifra del negocio en su tarjeta: la etiqueta pequeña y el número grande (dentro de un <dl>). */
export function KpiTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-3xl font-bold tracking-[-0.02em] tabular-nums">{value}</dd>
    </div>
  );
}

/** Cabecera de una tarjeta: el título y, a la derecha, una cifra o un enlace. */
export function DashCardHeader({ id, title, aside }: { id: string; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="text-base font-bold tracking-[-0.01em]">
        {title}
      </h2>
      {aside && <div className="text-sm text-muted-foreground">{aside}</div>}
    </div>
  );
}
