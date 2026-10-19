import { ChevronDown, HardDrive } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatabaseStats, DatabaseTables, DatabaseTableStat } from "@/types";
import { useAdminChartColors } from "../admin-chart-colors";
import { formatBytes, formatCount, formatShare, isSectionError } from "./database-format";
import { HelpNote, SectionError } from "./database-parts";

/** Las tablas que se ven de entrada; las demás, en «Ver las N demás». */
const VISIBLE_TABLES = 10;

/** Datos, índices y textos largos: un solo color en tres intensidades, y siempre con su cifra escrita. */
const PARTS = [
  { key: "dataBytes", label: "Datos", opacity: 1 },
  { key: "indexBytes", label: "Índices", opacity: 0.55 },
  { key: "toastBytes", label: "Textos largos", opacity: 0.28 },
] as const;

function PartsLegend({ color }: { color: string }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {PARTS.map((part) => (
        <li key={part.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: color, opacity: part.opacity }} aria-hidden />
          {part.label}
        </li>
      ))}
    </ul>
  );
}

/** Una tabla: su nombre en palabras (y el técnico), la barra de lo que ocupa, las cifras y si se borra sola. */
function TableRow({ table, max, color }: { table: DatabaseTableStat; max: number; color: string }) {
  const width = max > 0 ? Math.max(1, (table.totalBytes / max) * 100) : 0;
  return (
    <li className="space-y-1.5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0">
          <span className="font-medium">{table.label ?? table.name}</span>{" "}
          {table.label && <span className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{table.name}</span>}
        </p>
        <span className="shrink-0 font-semibold tabular-nums">{formatBytes(table.totalBytes)}</span>
      </div>
      <div className="flex h-2.5 gap-0.5" style={{ width: `${width}%` }} aria-hidden>
        {PARTS.map((part) =>
          table[part.key] > 0 ? (
            <span
              key={part.key}
              className="h-full min-w-0.5 first:rounded-l-sm last:rounded-r-sm"
              style={{ flexGrow: table[part.key], backgroundColor: color, opacity: part.opacity }}
            />
          ) : null,
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Datos {formatBytes(table.dataBytes)} · Índices {formatBytes(table.indexBytes)} · Textos largos {formatBytes(table.toastBytes)}
        {table.rows !== null && ` · ${formatCount(table.rows)} ${table.rows === 1 ? "fila" : "filas"}`}
      </p>
      {table.retention && (
        <p className="text-xs">
          <span className="text-muted-foreground">Se borra sola:</span> {table.retention === "Nunca" ? "nunca" : table.retention.charAt(0).toLowerCase() + table.retention.slice(1)}
        </p>
      )}
    </li>
  );
}

/** Un desplegable con su resumen («Ver las 29 demás», «Lo que trae Supabase · 2,3 MB»). */
function Fold({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t px-4 pb-2">{children}</div>
    </details>
  );
}

/** La frase de «Qué hacer»: la tabla que más ocupa y si es normal que crezca. */
function advice(tables: DatabaseTables, sizeBytes: number | null): string {
  const top = tables.app[0];
  if (!top) return "Todavía no hay tablas de Agenda360 en esta base.";
  const share = sizeBytes ? ` (${formatShare(top.totalBytes / sizeBytes)} de la base)` : "";
  const name = `«${top.label ?? top.name}», con ${formatBytes(top.totalBytes)}${share}`;
  if (!top.retention || top.retention === "Nunca") {
    return `La que más ocupa es ${name}. No se borra sola: son datos de los negocios y es normal que crezca con ellos.`;
  }
  return `La que más ocupa es ${name}, y se borra sola. Si sigue creciendo mucho, revisa en Salud que el cron esté pasando: es el que la limpia.`;
}

/**
 * «Qué ocupa» (historia 1): cada tabla de Agenda360 con lo que ocupan sus datos, sus índices y sus textos
 * largos, sus filas y su regla de borrado; lo que trae Supabase, plegado, y lo que no es de ninguna tabla.
 */
export function DatabaseTablesCard({ stats }: { stats: DatabaseStats }) {
  const { colors } = useAdminChartColors();
  const { tables } = stats;
  const sizeBytes = isSectionError(stats.size) ? null : stats.size.sizeBytes;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="space-y-1">
          <CardTitle className="inline-flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" aria-hidden /> Qué ocupa
          </CardTitle>
          <CardDescription>
            Cada tabla con lo que ocupan sus datos, sus índices (sirven para buscar rápido) y sus textos largos, cuántas filas tiene (lo que
            estima PostgreSQL) y si se borra sola.
          </CardDescription>
        </div>
        {!isSectionError(tables) && <PartsLegend color={colors.series} />}
      </CardHeader>
      <CardContent className="space-y-4">
        {isSectionError(tables) ? (
          <SectionError message={tables.error} />
        ) : (
          <>
            <HelpNote>{advice(tables, sizeBytes)}</HelpNote>
            <ul className="divide-y">
              {tables.app.slice(0, VISIBLE_TABLES).map((table) => (
                <TableRow key={table.name} table={table} max={tables.app[0]?.totalBytes ?? 0} color={colors.series} />
              ))}
            </ul>
            {tables.app.length > VISIBLE_TABLES && (
              <Fold summary={`Ver las ${tables.app.length - VISIBLE_TABLES} demás`}>
                <ul className="divide-y">
                  {tables.app.slice(VISIBLE_TABLES).map((table) => (
                    <TableRow key={table.name} table={table} max={tables.app[0].totalBytes} color={colors.series} />
                  ))}
                </ul>
              </Fold>
            )}
            <Fold
              summary={
                <span>
                  Lo que trae Supabase
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {tables.supabase.length > 0 ? formatBytes(tables.supabase.reduce((total, group) => total + group.totalBytes, 0)) : "nada en esta base"}
                  </span>
                </span>
              }
            >
              {tables.supabase.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">Esta base no tiene las tablas de Supabase (es una base local).</p>
              ) : (
                tables.supabase.map((group) => (
                  <section key={group.key} className="py-3">
                    <h4 className="flex justify-between gap-3 text-sm font-medium">
                      {group.label} <span className="tabular-nums">{formatBytes(group.totalBytes)}</span>
                    </h4>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {group.tables.map((table) => (
                        <li key={`${table.schema}.${table.name}`} className="flex justify-between gap-3">
                          <span className="min-w-0 [overflow-wrap:anywhere]">
                            {table.label && <span className="text-foreground">{table.label} </span>}
                            <span className="font-mono">
                              {table.schema}.{table.name}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums">{formatBytes(table.totalBytes)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </Fold>
            <p className="text-xs text-muted-foreground">
              Además, el catálogo de PostgreSQL y lo que no es de ninguna tabla: {formatBytes(tables.otherBytes)}. Viene con toda base y casi no crece.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
