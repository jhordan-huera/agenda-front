import type { ReactNode } from "react";

/** Piezas comunes de los gráficos del inicio del super admin (spec 006). */

/** Leyenda pequeña bajo el título: un color por serie (la línea punteada, como en el gráfico). */
export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0 w-4 border-t-[3px]"
            style={{ borderColor: item.color, borderStyle: item.dashed ? "dashed" : "solid" }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** «Ver como tabla»: los datos del gráfico para quien no lo ve o quiere el detalle (como en Reportes). */
export function ChartTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {head.map((cell, index) => (
                <th key={index} className={index === 0 ? "px-3 py-2 font-medium" : "px-3 py-2 text-right font-medium"}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, index) => (
                  <td key={index} className={index === 0 ? "px-3 py-1.5" : "px-3 py-1.5 text-right tabular-nums"}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Caja del tooltip, con el estilo de los de Reportes. */
export function TooltipBox({ title, lines }: { title: string; lines: { label: string; value: ReactNode; color: string }[] }) {
  return (
    <div className="min-w-40 rounded-lg border bg-popover p-3 text-xs shadow-md">
      <p className="font-medium">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {lines.map((line) => (
          <li key={line.label} className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: line.color }} aria-hidden />
              {line.label}
            </span>
            <span className="font-semibold text-foreground tabular-nums">{line.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
