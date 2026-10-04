import type { ReactNode } from "react";

export interface RankedBarItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Texto a la derecha (p. ej. "12 · 30 %"). */
  detail: ReactNode;
}

/**
 * Barras horizontales etiquetadas: la etiqueta identifica cada fila y la longitud
 * codifica la cantidad, así que el color nunca es el único canal de información.
 */
export function RankedBars({ items, max }: { items: RankedBarItem[]; max?: number }) {
  const scale = max ?? Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">{item.detail}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${(item.value / scale) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
